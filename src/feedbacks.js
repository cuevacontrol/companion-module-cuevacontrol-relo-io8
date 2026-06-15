'use strict'

const { combineRgb } = require('@companion-module/base')

const NUM_RELAYS = 8
const NUM_INPUTS = 8

function relayChoices() {
	return Array.from({ length: NUM_RELAYS }, (_, i) => ({ id: i + 1, label: `Relay ${i + 1}` }))
}

function inputChoices() {
	return Array.from({ length: NUM_INPUTS }, (_, i) => ({ id: i + 1, label: `Input ${i + 1}` }))
}

function updateFeedbacks(self) {
	self.setFeedbackDefinitions({
		connected: {
			name: 'Device Connected',
			description: 'Active when the WebSocket connection is authenticated',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 120, 35),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => self.authenticated,
		},


		led_enabled: {
			name: 'LED Enabled',
			description: 'Active when the status LED is turned on',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 120, 35),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => !!self.ledEnabled,
		},

		// -----------------------------------------------------------------------
		// Relay on/off state
		// -----------------------------------------------------------------------
		relay_state: {
			name: 'Relay State',
			description: 'Active when the selected relay is on. Use the built-in feedback invert to trigger when off.',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 120, 35),    // #007823 brand green
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'relay_id',
					type: 'dropdown',
					label: 'Relay',
					default: 1,
					choices: relayChoices(),
				},
			],
			callback: (feedback) => {
				const idx = Number(feedback.options.relay_id) - 1
				return self.relayState[idx] ?? false
			},
		},

		// -----------------------------------------------------------------------
		// Digital input active/inactive state
		// -----------------------------------------------------------------------
		input_state: {
			name: 'Input State',
			description: 'Active when the selected input is high. Use the built-in feedback invert to trigger when low.',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(13, 84, 43),    // #0D542B trigger green
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'input_id',
					type: 'dropdown',
					label: 'Input',
					default: 1,
					choices: inputChoices(),
				},
			],
			callback: (feedback) => {
				const idx = Number(feedback.options.input_id) - 1
				return self.inputState[idx] ?? false
			},
		},
	})
}

module.exports = { updateFeedbacks }
