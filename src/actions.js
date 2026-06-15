'use strict'

const NUM_RELAYS = 8

function relayChoices() {
	return Array.from({ length: NUM_RELAYS }, (_, i) => ({ id: i + 1, label: `Relay ${i + 1}` }))
}

function updateActions(self) {
	self.setActionDefinitions({
		// -----------------------------------------------------------------------
		// Set Relay
		// -----------------------------------------------------------------------
		set_relay: {
			name: 'Set Relay',
			options: [
				{
					id: 'relay_id',
					type: 'dropdown',
					label: 'Relay',
					default: 1,
					choices: relayChoices(),
				},
				{
					id: 'state',
					type: 'dropdown',
					label: 'Action',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'pulse', label: 'Pulse' },
					],
				},
				{
					id: 'duration_ms',
					type: 'number',
					label: 'Pulse duration (ms)',
					default: 500,
					min: 50,
					max: 60000,
					isVisibleFn: (options) => options.state === 'pulse',
				},
			],
			callback: async (action) => {
				const relay_id = Number(action.options.relay_id)
				const state = String(action.options.state)
				const duration_ms = Math.round(Number(action.options.duration_ms) || 500)

				if (state === 'pulse') {
					self.log('info', `PULSE relay=${relay_id} duration=${duration_ms}ms`)
					self._send({ type: 'SET_RELAY', relay_id, state: 'pulse', duration_ms })
				} else {
					self.log('info', `SET_RELAY relay=${relay_id} state=${state}`)
					self._send({ type: 'SET_RELAY', relay_id, state })
				}
			},
		},

		// -----------------------------------------------------------------------
		// Execute Node (trigger a node by ID)
		// -----------------------------------------------------------------------
		execute_node: {
			name: 'Execute Node',
			options: [
				{
					id: 'node_id',
					type: 'dropdown',
					label: 'Node',
					default: '',
					// Populated dynamically from the live node list after STATE_DUMP_COMPLETE
					choices: self.nodeChoices(),
					allowCustom: true,
					tooltip: 'Select a node, or type its numeric ID directly',
				},
			],
			callback: async (action) => {
				const { node_id } = action.options
				if (node_id === undefined || node_id === null || node_id === '') {
					self.log('warn', 'execute_node: no node_id provided')
					return
				}
				self._send({ type: 'EXECUTE_NODE', node_id: String(node_id) })
			},
		},

		// -----------------------------------------------------------------------
		// Apply Preset
		// -----------------------------------------------------------------------
		apply_preset: {
			name: 'Apply Preset',
			options: [
				{
					id: 'preset_id',
					type: 'dropdown',
					label: 'Preset',
					default: '',
					// Populated dynamically from the live preset list after STATE_DUMP_COMPLETE
					choices: self.presetChoices(),
					allowCustom: true,
					tooltip: 'Select a preset, or type its ID directly',
				},
			],
			callback: async (action) => {
				const { preset_id } = action.options
				if (preset_id === undefined || preset_id === null || preset_id === '') {
					self.log('warn', 'apply_preset: no preset_id provided')
					return
				}
				self._send({ type: 'APPLY_PRESET', preset_id })
			},
		},

		// -----------------------------------------------------------------------
		// Refresh — re-request full state dump (updates node and preset lists)
		// -----------------------------------------------------------------------
		refresh: {
			name: 'Refresh Device State',
			description: 'Re-fetches all nodes, presets, relay states and input states from the device. Use this after creating or editing nodes/presets on the device.',
			options: [],
			callback: async () => {
				self.refresh()
			},
		},

		// -----------------------------------------------------------------------
		// LED — color, brightness, effect, on/off
		// -----------------------------------------------------------------------
		set_led_color: {
			name: 'Set LED Color',
			options: [
				{
					id: 'hex_color',
					type: 'colorpicker',
					label: 'Color',
					default: '#007823',
					returnType: 'string',
				},
			],
			callback: async (action) => {
				self._send({ type: 'SET_LED_COLOR', hex_color: action.options.hex_color })
			},
		},

		set_led_brightness: {
			name: 'Set LED Brightness',
			options: [
				{
					id: 'brightness',
					type: 'number',
					label: 'Brightness (0-255)',
					default: 128,
					min: 0,
					max: 255,
				},
			],
			callback: async (action) => {
				self._send({ type: 'SET_LED_BRIGHTNESS', brightness: Math.round(Number(action.options.brightness)) })
			},
		},

		set_led_effect: {
			name: 'Set LED Effect',
			options: [
				{
					id: 'effect',
					type: 'dropdown',
					label: 'Effect',
					default: 0,
					choices: [
						{ id: 0, label: 'Solid' },
						{ id: 1, label: 'Blink' },
						{ id: 2, label: 'Breathing' },
						{ id: 3, label: 'Rainbow' },
						{ id: 4, label: 'Chase' },
						{ id: 5, label: 'Locate' },
					],
				},
				{
					id: 'speed_ms',
					type: 'number',
					label: 'Speed (ms per cycle)',
					default: 1000,
					min: 100,
					max: 10000,
				},
			],
			callback: async (action) => {
				self._send({
					type: 'SET_LED_EFFECT',
					effect: Number(action.options.effect),
					speed_ms: Math.round(Number(action.options.speed_ms)),
				})
			},
		},

		set_led_enabled: {
			name: 'Set LED On/Off',
			options: [
				{
					id: 'enabled',
					type: 'dropdown',
					label: 'State',
					default: 'on',
					choices: [
						{ id: 'on',     label: 'On' },
						{ id: 'off',    label: 'Off' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				const { enabled } = action.options
				let state
				if (enabled === 'toggle') {
					state = !self.ledEnabled
				} else {
					state = enabled === 'on'
				}
				self._send({ type: 'SET_LED_ENABLED', enabled: state })
			},
		},

		// -----------------------------------------------------------------------
		// Set Relay Label
		// -----------------------------------------------------------------------
		set_relay_label: {
			name: 'Set Relay Label',
			options: [
				{
					id: 'relay_id',
					type: 'dropdown',
					label: 'Relay',
					default: 1,
					choices: relayChoices(),
				},
				{
					id: 'label',
					type: 'textinput',
					label: 'New Label',
					default: '',
				},
			],
			callback: async (action) => {
				const { relay_id, label } = action.options
				self._send({ type: 'SET_RELAY_LABEL', relay_id: Number(relay_id), label })
			},
		},
	})
}

module.exports = { updateActions }
