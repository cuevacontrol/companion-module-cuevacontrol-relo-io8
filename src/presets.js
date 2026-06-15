'use strict'

const { combineRgb } = require('@companion-module/base')

const NUM_RELAYS = 8
const NUM_INPUTS = 8

// Colors matching cueva-desktop-app nodeColors.ts
const TRIGGER_GREEN  = combineRgb(13,  84,  43)   // #0D542B  trigger nodes (GPIO input active)
const ACTION_BLUE    = combineRgb(28,  57, 142)   // #1C398E  action nodes  (relay control)
const PULSE_AMBER    = combineRgb(146, 64,  14)   // #92400E  condition      (pulse)
const INACTIVE_RED   = combineRgb(127, 29,  29)   // #7F1D1D  inactive / off
const BRAND_GREEN    = combineRgb(0,  120,  35)   // #007823  Cueva brand ON state
const WHITE          = combineRgb(255, 255, 255)
const DARK           = combineRgb(20,  20,  20)

function updatePresets(self) {
	const id = self.label
	const presets = {}

	for (let i = 1; i <= NUM_RELAYS; i++) {
		// Toggle — action blue base, brand green when on
		presets[`relay_${i}_toggle`] = {
			type: 'button',
			category: 'Relays',
			name: `Toggle Relay ${i}`,
			style: {
				text: `$(${id}:relay_${i}_label)`,
				size: '18',
				color: WHITE,
				bgcolor: ACTION_BLUE,
			},
			steps: [
				{
					down: [{ actionId: 'set_relay', options: { relay_id: i, state: 'toggle', duration_ms: 500 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'relay_state',
					options: { relay_id: i },
					style: { bgcolor: BRAND_GREEN, color: WHITE },
				},
			],
		}

		// Pulse — amber (condition color)
		presets[`relay_${i}_pulse`] = {
			type: 'button',
			category: 'Relays - Pulse',
			name: `Pulse Relay ${i}`,
			style: {
				text: `$(${id}:relay_${i}_label)\nPULSE`,
				size: 'auto',
				color: WHITE,
				bgcolor: PULSE_AMBER,
			},
			steps: [
				{
					down: [{ actionId: 'set_relay', options: { relay_id: i, state: 'pulse', duration_ms: 500 } }],
					up: [],
				},
			],
			feedbacks: [],
		}

		// On — brand green
		presets[`relay_${i}_on`] = {
			type: 'button',
			category: 'Relays - On/Off',
			name: `Relay ${i} On`,
			style: {
				text: `$(${id}:relay_${i}_label)\nON`,
				size: 'auto',
				color: WHITE,
				bgcolor: BRAND_GREEN,
			},
			steps: [
				{
					down: [{ actionId: 'set_relay', options: { relay_id: i, state: 'on', duration_ms: 500 } }],
					up: [],
				},
			],
			feedbacks: [],
		}

		// Off — dark red
		presets[`relay_${i}_off`] = {
			type: 'button',
			category: 'Relays - On/Off',
			name: `Relay ${i} Off`,
			style: {
				text: `$(${id}:relay_${i}_label)\nOFF`,
				size: 'auto',
				color: WHITE,
				bgcolor: INACTIVE_RED,
			},
			steps: [
				{
					down: [{ actionId: 'set_relay', options: { relay_id: i, state: 'off', duration_ms: 500 } }],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	// Inputs — trigger green when HIGH, dark red when LOW
	for (let i = 1; i <= NUM_INPUTS; i++) {
		presets[`input_${i}_monitor`] = {
			type: 'button',
			category: 'Inputs',
			name: `Monitor Input ${i}`,
			style: {
				text: `$(${id}:input_${i}_label)\nLOW`,
				size: 'auto',
				color: WHITE,
				bgcolor: INACTIVE_RED,
			},
			steps: [{ down: [], up: [] }],
			feedbacks: [
				{
					feedbackId: 'input_state',
					options: { input_id: i },
					style: {
						text: `$(${id}:input_${i}_label)\nHIGH`,
						bgcolor: TRIGGER_GREEN,
						color: WHITE,
					},
				},
			],
		}
	}

	// Device name + IP
	presets['device_info'] = {
		type: 'button',
		category: 'Device',
		name: 'Device Name + IP',
		style: {
			text: `$(${id}:device_name)\n$(${id}:ip)`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(20, 20, 20),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Firmware version + Device ID
	presets['device_firmware'] = {
		type: 'button',
		category: 'Device',
		name: 'Firmware + Device ID',
		style: {
			text: `$(${id}:firmware_version)\n$(${id}:device_id)`,
			size: '7',
			color: combineRgb(180, 180, 180),
			bgcolor: combineRgb(20, 20, 20),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Uptime
	presets['device_uptime'] = {
		type: 'button',
		category: 'Device',
		name: 'Uptime',
		style: {
			text: `UPTIME\n$(${id}:uptime_formatted)`,
			size: '14',
			color: WHITE,
			bgcolor: combineRgb(20, 20, 20),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// MAC address
	presets['device_mac'] = {
		type: 'button',
		category: 'Device',
		name: 'MAC Address',
		style: {
			text: `MAC\n$(${id}:mac)`,
			size: '7',
			color: combineRgb(180, 180, 180),
			bgcolor: combineRgb(20, 20, 20),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Relay summary — how many relays are on
	presets['relay_summary'] = {
		type: 'button',
		category: 'Device',
		name: 'Relay Summary',
		style: {
			text: `RELAYS ON\n$(${id}:relays_on) / 8`,
			size: '14',
			color: WHITE,
			bgcolor: ACTION_BLUE,
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Node + Preset counts
	presets['device_counts'] = {
		type: 'button',
		category: 'Device',
		name: 'Nodes + Presets',
		style: {
			text: `$(${id}:node_count) nodes\n$(${id}:preset_count) presets`,
			size: '14',
			color: combineRgb(180, 180, 180),
			bgcolor: combineRgb(20, 20, 20),
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [],
	}

	// Connection status button
	presets['connection_status'] = {
		type: 'button',
		category: 'Device',
		name: 'Connection Status',
		style: {
			text: `$(${id}:device_name)\nOFFLINE`,
			size: '14',
			color: WHITE,
			bgcolor: INACTIVE_RED,
		},
		steps: [{ down: [], up: [] }],
		feedbacks: [
			{
				feedbackId: 'connected',
				options: {},
				style: {
					text: `$(${id}:device_name)\nONLINE`,
					bgcolor: BRAND_GREEN,
					color: WHITE,
				},
			},
		],
	}

	// LED presets
	presets['led_toggle'] = {
		type: 'button',
		category: 'LED',
		name: 'Toggle LED',
		style: { text: 'LED\nTOGGLE', size: '14', color: WHITE, bgcolor: DARK },
		steps: [{ down: [{ actionId: 'set_led_enabled', options: { enabled: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'led_enabled', options: {}, style: { bgcolor: BRAND_GREEN, color: WHITE } }],
	}

	presets['led_on'] = {
		type: 'button',
		category: 'LED',
		name: 'LED On',
		style: { text: 'LED\nON', size: '14', color: WHITE, bgcolor: BRAND_GREEN },
		steps: [{ down: [{ actionId: 'set_led_enabled', options: { enabled: 'on' } }], up: [] }],
		feedbacks: [],
	}

	presets['led_off'] = {
		type: 'button',
		category: 'LED',
		name: 'LED Off',
		style: { text: 'LED\nOFF', size: '14', color: WHITE, bgcolor: INACTIVE_RED },
		steps: [{ down: [{ actionId: 'set_led_enabled', options: { enabled: 'off' } }], up: [] }],
		feedbacks: [],
	}

	const effects = ['Solid', 'Blink', 'Breathing', 'Rainbow', 'Chase']
	effects.forEach((name, idx) => {
		presets[`led_effect_${idx}`] = {
			type: 'button',
			category: 'LED',
			name: `LED ${name}`,
			style: { text: `LED\n${name.toUpperCase()}`, size: '14', color: WHITE, bgcolor: ACTION_BLUE },
			steps: [{ down: [{ actionId: 'set_led_effect', options: { effect: idx, speed_ms: 1000 } }], up: [] }],
			feedbacks: [],
		}
	})

	presets['led_cueva_green'] = {
		type: 'button',
		category: 'LED',
		name: 'LED Cueva Green',
		style: { text: 'LED\nGREEN', size: '14', color: WHITE, bgcolor: BRAND_GREEN },
		steps: [{ down: [{ actionId: 'set_led_color', options: { hex_color: '#007823' } }], up: [] }],
		feedbacks: [],
	}

	self.setPresetDefinitions(presets)
}

module.exports = { updatePresets }
