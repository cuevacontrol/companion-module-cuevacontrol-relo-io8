'use strict'

const { InstanceBase, InstanceStatus, runEntrypoint } = require('@companion-module/base')
const WebSocket = require('ws')
const { updateActions } = require('./actions')
const { updateFeedbacks } = require('./feedbacks')
const { updateVariableDefinitions } = require('./variables')
const { updatePresets } = require('./presets')

const RECONNECT_DELAY_MS = 5000
const PING_INTERVAL_MS = 20000
const NUM_RELAYS = 8
const NUM_INPUTS = 8

class ReloIO8Instance extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.ws = null
		this.reconnectTimer = null
		this.pingTimer = null
		this.uptimeTimer = null
		this.authenticated = false

		// GPIO state
		this.relayState = Array(NUM_RELAYS).fill(false)
		this.relayLabels = Array.from({ length: NUM_RELAYS }, (_, i) => `Relay ${i + 1}`)
		this.inputState = Array(NUM_INPUTS).fill(false)
		this.inputLabels = Array.from({ length: NUM_INPUTS }, (_, i) => `Input ${i + 1}`)

		// Device info
		this.deviceName = ''
		this.deviceIp = ''
		this.deviceMac = ''
		this.firmwareVersion = ''
		this.deviceId = ''
		this.uptime = 0

		// Nodes: id (string) → { id, name, type, subtype, enabled }
		this.nodes = {}

		// Presets: id → name
		this.presetMap = {}

		// LED state
		this.ledEnabled    = false
		this.ledColor      = '#000000'
		this.ledBrightness = 128
		this.ledEffect     = 0

		// Set to true while a state dump is in progress so we clear stale data once
		this._dumpInProgress = false
	}

	// -------------------------------------------------------------------------
	// Lifecycle
	// -------------------------------------------------------------------------

	async init(config) {
		this.config = config
		this._setupDefinitions()
		this._connect()
	}

	async destroy() {
		this._clearTimers()
		if (this.ws) {
			this.ws.removeAllListeners()
			this.ws.terminate()
			this.ws = null
		}
		this.log('debug', 'Destroyed')
	}

	async configUpdated(config) {
		const needsReconnect = config.host !== this.config.host || config.token !== this.config.token
		this.config = config
		if (needsReconnect) {
			this._clearTimers()
			this.authenticated = false
			if (this.ws) {
				this.ws.removeAllListeners()
				this.ws.terminate()
				this.ws = null
			}
			this._connect()
		}
	}

	getConfigFields() {
		return [
			{
				id: 'host',
				type: 'textinput',
				label: 'Host (IP address or hostname)',
				width: 12,
				default: '192.168.1.100',
				regex: '/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/',
			},
			{
				id: 'token',
				type: 'textinput',
				label: 'Auth Token (64-char hex — found in the device settings)',
				width: 12,
				default: '',
			},
		]
	}

	// -------------------------------------------------------------------------
	// WebSocket connection
	// -------------------------------------------------------------------------

	_connect() {
		if (!this.config.host || !this.config.token) {
			this.updateStatus(InstanceStatus.BadConfig, 'Host and token are required')
			return
		}

		const url = `ws://${this.config.host}/ws`
		this.log('debug', `Connecting to ${url}`)
		this.updateStatus(InstanceStatus.Connecting)

		try {
			this.ws = new WebSocket(url, { handshakeTimeout: 5000 })
		} catch (err) {
			this.log('error', `Failed to create WebSocket: ${err.message}`)
			this._scheduleReconnect()
			return
		}

		this.ws.on('open', () => {
			this.log('debug', 'WebSocket open — authenticating')
			this._send({ type: 'AUTH', token: this.config.token })
		})

		this.ws.on('message', (data) => {
			try {
				this._handleMessage(JSON.parse(data.toString()))
			} catch (err) {
				this.log('warn', `Unparseable message: ${err.message}`)
			}
		})

		this.ws.on('close', (code, reason) => {
			this.log('info', `WebSocket closed (${code}): ${reason}`)
			this._onDisconnected()
		})

		this.ws.on('error', (err) => {
			this.log('warn', `WebSocket error: ${err.message}`)
		})
	}

	_onDisconnected() {
		this.authenticated = false
		clearInterval(this.pingTimer)
		this.pingTimer = null
		clearInterval(this.uptimeTimer)
		this.uptimeTimer = null
		this.updateStatus(InstanceStatus.Disconnected)
		this._setVariable('connected', 'false')
		this.checkFeedbacks('connected')
		this._scheduleReconnect()
	}

	_scheduleReconnect() {
		if (this.reconnectTimer) return
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null
			this._connect()
		}, RECONNECT_DELAY_MS)
	}

	_clearTimers() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
		if (this.pingTimer) {
			clearInterval(this.pingTimer)
			this.pingTimer = null
		}
		if (this.uptimeTimer) {
			clearInterval(this.uptimeTimer)
			this.uptimeTimer = null
		}
	}

	_send(obj) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(obj))
		}
	}

	// -------------------------------------------------------------------------
	// Message handling
	// -------------------------------------------------------------------------

	_handleMessage(msg) {
		switch (msg.type) {
			case 'AUTH_OK':
				this.log('info', 'Authenticated — requesting state dump')
				this.authenticated = true
				this.updateStatus(InstanceStatus.Ok)
				this._setVariable('connected', 'true')
				this.checkFeedbacks('connected')
				this._send({ type: 'GET_STATE' })
				this.pingTimer = setInterval(() => this._send({ type: 'PING' }), PING_INTERVAL_MS)
				// Tick uptime every second so the variable stays live
				this.uptimeTimer = setInterval(() => {
					this.uptime += 1000
					const secs = Math.floor(this.uptime / 1000)
					this.setVariableValues({
						uptime: String(secs),
						uptime_formatted: this._formatUptime(secs),
					})
				}, 1000)
				break

			case 'AUTH_FAIL':
			case 'AUTH_ERROR':
				this.log('error', 'Authentication failed — check token')
				this.updateStatus(InstanceStatus.ConnectionFailure, 'Auth failed')
				this.ws.terminate()
				break

			case 'STATE_DUMP_BEGIN':
				// Clear stale nodes and presets so a refresh produces a clean list
				this.nodes = {}
				this.presetMap = {}
				this._dumpInProgress = true
				break

			case 'STATE_DUMP_SECTION':
				this._handleStateDumpSection(msg.section, msg.data, msg.page)
				break

			case 'STATE_DUMP_COMPLETE':
				this._dumpInProgress = false
				this.log('debug', 'State dump complete')
				this._refreshAll()
				updateActions(this)
				break

			case 'RELAY_CHANGE':
				this._onRelayChange(msg.relay_id, msg.state, msg.label)
				break

			case 'INPUT_CHANGE':
				this._onInputChange(msg.input_id, msg.state, msg.label)
				break

			case 'RELAY_LABEL_UPDATED':
				if (msg.relay_id >= 1 && msg.relay_id <= NUM_RELAYS) {
					this.relayLabels[msg.relay_id - 1] = msg.label || `Relay ${msg.relay_id}`
					this._setVariable(`relay_${msg.relay_id}_label`, this.relayLabels[msg.relay_id - 1])
				}
				break

			case 'INPUT_LABEL_UPDATED':
				if (msg.input_id >= 1 && msg.input_id <= NUM_INPUTS) {
					this.inputLabels[msg.input_id - 1] = msg.label || `Input ${msg.input_id}`
					this._setVariable(`input_${msg.input_id}_label`, this.inputLabels[msg.input_id - 1])
				}
				break

			case 'DEVICE_NAME_UPDATED':
				if (msg.device_name) {
					this.deviceName = msg.device_name
					this._setVariable('device_name', msg.device_name)
				}
				break

			case 'NODE_CREATED':
			case 'NODE_UPDATED':
				if (msg.data && !this._dumpInProgress) {
					this._upsertNode(msg.data)
					this._setVariable('node_count', String(Object.keys(this.nodes).length))
					updateActions(this)
				}
				break

			case 'NODE_DELETED':
				if (msg.node_id && !this._dumpInProgress) {
					delete this.nodes[String(msg.node_id)]
					this._setVariable('node_count', String(Object.keys(this.nodes).length))
					updateActions(this)
				}
				break

			case 'PRESET_CREATED':
			case 'PRESET_UPDATED':
				if (msg.preset && !this._dumpInProgress) {
					this.presetMap[msg.preset.id] = msg.preset.name || msg.preset.id
					this._setVariable('preset_count', String(Object.keys(this.presetMap).length))
					updateActions(this)
				}
				break

			case 'PRESET_DELETED':
				if (msg.preset_id && !this._dumpInProgress) {
					delete this.presetMap[msg.preset_id]
					this._setVariable('preset_count', String(Object.keys(this.presetMap).length))
					updateActions(this)
				}
				break

			case 'PRESET_APPLIED':
				break

			case 'LED_UPDATED':
				this._onLedUpdated(msg)
				break

			case 'RELAY_PULSE_STARTED':
				break

			case 'PONG':
				break

			case 'ACK':
				if (!msg.success) {
					this.log('warn', `Command failed: ${msg.error || 'unknown error'}`)
				}
				break

			default:
				break
		}
	}

	_handleStateDumpSection(section, data, page) {
		if (!data) return

		if (section === 'system') {
			// System info
			if (data.system) {
				const sys = data.system
				if (sys.ip) {
					this.deviceIp = sys.ip
					this._setVariable('ip', sys.ip)
				}
				if (sys.mac) {
					this.deviceMac = sys.mac
					this._setVariable('mac', sys.mac)
				}
				if (sys.firmware_version) {
					this.firmwareVersion = sys.firmware_version
					this._setVariable('firmware_version', sys.firmware_version)
				}
				if (sys.device_id) {
					this.deviceId = sys.device_id
					this._setVariable('device_id', sys.device_id)
				}
				if (sys.uptime_ms != null) {
					this.uptime = sys.uptime_ms
					this._setVariable('uptime', String(Math.floor(sys.uptime_ms / 1000)))
				}
			}

			// Relay states + labels
			if (Array.isArray(data.relays)) {
				data.relays.forEach((r, i) => {
					if (i < NUM_RELAYS) {
						this.relayState[i] = !!r.state
						this.relayLabels[i] = r.label || `Relay ${i + 1}`
					}
				})
			}

			// Input states + labels
			if (Array.isArray(data.inputs)) {
				data.inputs.forEach((inp, i) => {
					if (i < NUM_INPUTS) {
						this.inputState[i] = !!inp.state
						this.inputLabels[i] = inp.label || `Input ${i + 1}`
					}
				})
			}

			// Presets
			if (Array.isArray(data.presets)) {
				data.presets.forEach((p) => {
					if (p.id) this.presetMap[p.id] = p.name || p.id
				})
				this._setVariable('preset_count', String(Object.keys(this.presetMap).length))
			}
		}

		if (section === 'system' && data && data.led) {
			this._applyLedState(data.led)
		}

		if (section === 'nodes') {
			// May come in multiple pages
			if (Array.isArray(data.nodes)) {
				data.nodes.forEach((n) => this._upsertNode(n))
				this._setVariable('node_count', String(Object.keys(this.nodes).length))
			}
		}
	}

	_upsertNode(n) {
		if (!n || !n.id) return

		// Build a human-readable display name from config where possible
		let displayName = n.name || n.label || ''
		const cfg = n.config || {}

		if (n.subtype === 'relay_control' && cfg.relay != null) {
			const relayLabel = this.relayLabels[cfg.relay - 1] || `Relay ${cfg.relay}`
			displayName = displayName || 'Relay Control'
			displayName = `${displayName} — ${relayLabel}`
		} else if (n.subtype === 'gpio_input' && cfg.pin != null) {
			const pin = cfg.pin
			const inputLabel = this.inputLabels[pin - 1] || `Input ${pin}`
			displayName = displayName || 'GPIO Input'
			displayName = `${displayName} — ${inputLabel}`
		} else if (!displayName) {
			displayName = `${n.type || ''}/${n.subtype || ''} #${String(n.id).slice(-4)}`
		}

		this.nodes[String(n.id)] = {
			id: String(n.id),
			name: displayName,
			type: n.type || '',
			subtype: n.subtype || '',
			enabled: n.enabled !== false,
		}
	}

	_applyLedState(led) {
		if (led.enabled != null)    this.ledEnabled    = !!led.enabled
		if (led.hex_color)          this.ledColor      = led.hex_color
		if (led.brightness != null) this.ledBrightness = led.brightness
		if (led.effect != null)     this.ledEffect     = led.effect
		this.setVariableValues({
			led_enabled:    this.ledEnabled ? 'true' : 'false',
			led_color:      this.ledColor,
			led_brightness: String(this.ledBrightness),
			led_effect:     String(this.ledEffect),
		})
		this.checkFeedbacks('led_enabled')
	}

	_onLedUpdated(msg) {
		this._applyLedState(msg)
	}

	_onRelayChange(relayId, state, label) {
		if (relayId < 1 || relayId > NUM_RELAYS) return
		this.log('debug', `RELAY_CHANGE relay=${relayId} state=${state} label=${label}`)
		const idx = relayId - 1
		this.relayState[idx] = !!state
		if (label) this.relayLabels[idx] = label
		this._setVariable(`relay_${relayId}_state`, state ? 'true' : 'false')
		if (label) this._setVariable(`relay_${relayId}_label`, label)
		this._setVariable('relays_on', String(this._countRelaysOn()))
		this.checkFeedbacks('relay_state')
	}

	_onInputChange(inputId, state, label) {
		if (inputId < 1 || inputId > NUM_INPUTS) return
		this.log('debug', `INPUT_CHANGE input=${inputId} state=${state} label=${label}`)
		const idx = inputId - 1
		this.inputState[idx] = !!state
		if (label) this.inputLabels[idx] = label
		this._setVariable(`input_${inputId}_state`, state ? 'true' : 'false')
		if (label) this._setVariable(`input_${inputId}_label`, label)
		this.checkFeedbacks('input_state')
	}

	_setVariable(name, value) {
		this.setVariableValues({ [name]: value })
	}

	_formatUptime(seconds) {
		const s = Math.floor(seconds)
		if (s < 60) return `${s}s`
		const d   = Math.floor(s / 86400)
		const h   = Math.floor((s % 86400) / 3600)
		const m   = Math.floor((s % 3600) / 60)
		const sec = s % 60
		if (d > 0) return `${d}d ${h}h ${m}m`
		if (h > 0) return `${h}h ${m}m ${sec}s`
		return `${m}m ${sec}s`
	}

	_countRelaysOn() {
		return this.relayState.filter(Boolean).length
	}

	_refreshAll() {
		const uptimeSecs = Math.floor(this.uptime / 1000)
		const vars = {
			connected: this.authenticated ? 'true' : 'false',
			device_name: this.deviceName,
			ip: this.deviceIp,
			mac: this.deviceMac,
			firmware_version: this.firmwareVersion,
			device_id: this.deviceId,
			uptime: String(uptimeSecs),
			uptime_formatted: this._formatUptime(uptimeSecs),
			relays_on: String(this._countRelaysOn()),
			node_count: String(Object.keys(this.nodes).length),
			preset_count: String(Object.keys(this.presetMap).length),
		}
		for (let i = 0; i < NUM_RELAYS; i++) {
			vars[`relay_${i + 1}_state`] = this.relayState[i] ? 'true' : 'false'
			vars[`relay_${i + 1}_label`] = this.relayLabels[i]
		}
		for (let i = 0; i < NUM_INPUTS; i++) {
			vars[`input_${i + 1}_state`] = this.inputState[i] ? 'true' : 'false'
			vars[`input_${i + 1}_label`] = this.inputLabels[i]
		}
		this.setVariableValues(vars)
		this.checkFeedbacks('relay_state', 'input_state')
	}

	_setupDefinitions() {
		updateVariableDefinitions(this)
		updateActions(this)
		updateFeedbacks(this)
		updatePresets(this)
	}

	// Re-request a full state dump from the device
	refresh() {
		if (!this.authenticated) {
			this.log('warn', 'refresh: not connected')
			return
		}
		this._send({ type: 'GET_STATE' })
	}

	// Public helpers for actions
	nodeChoices() {
		const choices = Object.values(this.nodes).map((n) => ({
			id: n.id,
			label: n.name + (n.type ? ` [${n.type}/${n.subtype}]` : ''),
		}))
		if (choices.length === 0) choices.push({ id: '', label: '(no nodes — connect device first)' })
		return choices
	}

	presetChoices() {
		const choices = Object.entries(this.presetMap).map(([id, name]) => ({
			id,
			label: name,
		}))
		if (choices.length === 0) choices.push({ id: '', label: '(no presets — connect device first)' })
		return choices
	}
}

runEntrypoint(ReloIO8Instance, [])
