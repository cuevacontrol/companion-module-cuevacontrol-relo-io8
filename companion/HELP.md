# Cueva Control RELO IO8

The **Cueva Control RELO IO8** is an Ethernet I/O module built for professional automation and control. It features 8 relay outputs, 8 digital inputs, a built-in automation engine, and full cloud connectivity — designed to work standalone or as part of a larger system.

Learn more and find the full product documentation at **[cuevacontrol.com](https://cuevacontrol.com)**.

---

## What the RELO IO8 supports

**I/O**
- 8 relay outputs — on, off, toggle, or pulse with configurable duration
- 8 digital inputs — monitored in real time with configurable labels

**Connectivity**
- Local control over Ethernet (100 Mbps)
- Remote cloud control via Cueva Horizon
- HTTP REST API, WebSocket, TCP, OSC, and UDP
- Firmware updates over the air

**Automation**
- Node-based visual automation engine
- Relay presets — save and recall multi-relay states instantly
- Real-time clock (RTC) for time-based triggers
- Multi-device support — pair multiple RELO IO8 units together

**Management**
- Desktop app for full configuration and monitoring
- RGB status LED with effects (Solid, Blink, Breathing, Rainbow, Chase)
- Device discovery over the local network

---

## Companion Connection Setup

1. Set the **Host** to the IP address of the RELO IO8.
2. Paste the **Auth Token** from the device settings under **Settings - Integrations**.

The module connects automatically and reconnects if the connection drops.

---

## Actions

| Action | Description |
|---|---|
| **Set Relay** | Turn a relay on, off, toggle it, or pulse it for a configurable duration |
| **Execute Node** | Trigger a node selected from the live node list |
| **Apply Preset** | Apply a saved relay preset selected from the live preset list |
| **Set Relay Label** | Rename a relay on the device |
| **Set LED Color** | Set the status LED color |
| **Set LED Brightness** | Set the status LED brightness (0-255) |
| **Set LED Effect** | Set the status LED effect (Solid, Blink, Breathing, Rainbow, Chase) |
| **Set LED On/Off** | Turn the status LED on, off, or toggle it |
| **Refresh Device State** | Re-fetch all nodes, presets, relay and input states from the device |

---

## Feedbacks

| Feedback | Description |
|---|---|
| **Relay State** | Button style changes when the selected relay is on or off |
| **Input State** | Button style changes when the selected input is active or inactive |
| **Device Connected** | Button style changes when the device is connected |
| **LED Enabled** | Button style changes when the status LED is on |

---

## Using Variables on Buttons

Variables update live from the device. The default connection label is `RELO-IO8`. Use the **$** button next to the text field to pick variables from a list.

### Relays

| Variable | Description |
|---|---|
| `$(RELO-IO8:relay_N_state)` | true / false for relay N (1-8) |
| `$(RELO-IO8:relay_N_label)` | Label for relay N |
| `$(RELO-IO8:relays_on)` | Number of relays currently ON |

### Inputs

| Variable | Description |
|---|---|
| `$(RELO-IO8:input_N_state)` | true / false for input N (1-8) |
| `$(RELO-IO8:input_N_label)` | Label for input N |

### Status LED

| Variable | Description |
|---|---|
| `$(RELO-IO8:led_enabled)` | true / false |
| `$(RELO-IO8:led_color)` | Color as hex (#RRGGBB) |
| `$(RELO-IO8:led_brightness)` | Brightness 0-255 |
| `$(RELO-IO8:led_effect)` | Effect number (0=Solid 1=Blink 2=Breathing 3=Rainbow 4=Chase) |

### Connection and device

| Variable | Description |
|---|---|
| `$(RELO-IO8:connected)` | true when connected |
| `$(RELO-IO8:device_name)` | Device name |
| `$(RELO-IO8:ip)` | Device IP address |
| `$(RELO-IO8:uptime_formatted)` | Uptime (e.g. 2h 34m 12s) |

### Diagnostic

| Variable | Description |
|---|---|
| `$(RELO-IO8:mac)` | Device MAC address |
| `$(RELO-IO8:firmware_version)` | Firmware version |
| `$(RELO-IO8:device_id)` | Unique device ID |
| `$(RELO-IO8:uptime)` | Uptime in seconds |
| `$(RELO-IO8:node_count)` | Number of nodes on the device |
| `$(RELO-IO8:preset_count)` | Number of presets on the device |

---

## Notes

- Relay and input states update automatically whenever they change on the device.
- Node and preset lists update live. Use **Refresh Device State** if a dropdown still shows stale data after making changes on the device.
- For more information about the RELO IO8 visit [cuevacontrol.com](https://cuevacontrol.com).
