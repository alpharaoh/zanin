# Zanin Firmware

Firmware for the Zanin wearable audio recorder.

> **📋 See [PLAN.md](./PLAN.md) for the complete development plan, architecture, and context for AI assistants.**

## Requirements

- Microphone (high quality audio capture)
- Storage (microSD or onboard flash)
- USB-C (file transfer to PC as mass storage device)
- Button (start/stop recording, or other controls)
- Battery (LiPo with charging)
- LED (status indicator)

## Recommended Approach: ESP32-S3

The **ESP32-S3** is the best fit for this project because:

1. **Native USB OTG** - Can act as a USB Mass Storage Device (MSD), so when plugged into your PC it appears as a removable drive
2. **I2S Peripheral** - Direct support for digital microphones with high-quality audio
3. **Dual-core 240MHz** - Plenty of power for audio processing
4. **Low power modes** - Important for battery life
5. **Large community** - Tons of examples and libraries
6. **Affordable** - Dev boards are $5-15

### Why not other options?

| Chip | Pros | Cons |
|------|------|------|
| RP2040 | Cheap, USB | Limited RAM (264KB), no built-in WiFi |
| STM32 | Professional, great audio | Steeper learning curve, more complex tooling |
| nRF52840 | Ultra low power, USB | More expensive, smaller community |
| ESP32 (original) | Cheap, WiFi | No native USB (needs UART bridge) |

## Hardware Components

### 1. Microcontroller Board

**Recommended: ESP32-S3 DevKitC-1** (~$10)
- USB-C connector
- Onboard LED
- Castellated holes for custom PCB later

**Alternative for prototyping: Adafruit ESP32-S3 Feather** (~$18)
- Built-in LiPo charging
- More beginner friendly
- STEMMA QT connector for easy I2C

### 2. Microphone

**Recommended: INMP441 I2S MEMS Microphone** (~$3-5)
- Digital I2S output (no ADC noise)
- High SNR (signal-to-noise ratio): 61dB
- Low power: 1.4mA
- Small form factor

**Alternative: SPH0645LM4H** (~$5)
- Similar specs, different pinout
- Adafruit breakout available

**Wiring (INMP441 to ESP32-S3):**
```
INMP441    ESP32-S3
-------    --------
VDD    ->  3.3V
GND    ->  GND
SD     ->  GPIO 8  (I2S Data)
WS     ->  GPIO 9  (I2S Word Select / LRCLK)
SCK    ->  GPIO 10 (I2S Clock / BCLK)
L/R    ->  GND     (Left channel) or 3.3V (Right channel)
```

### 3. Storage

**Option A: MicroSD Card Module** (~$2)
- Removable storage
- Easy to swap cards
- Uses SPI interface
- Recommended: SanDisk High Endurance (designed for continuous writes)

**Option B: Onboard Flash (W25Q128)** (~$1)
- 16MB flash chip
- No moving parts
- Faster access
- Limited write cycles

**Recommendation:** Start with microSD for flexibility, consider onboard flash for final product.

**MicroSD Wiring:**
```
SD Module  ESP32-S3
---------  --------
VCC    ->  3.3V
GND    ->  GND
MISO   ->  GPIO 13
MOSI   ->  GPIO 11
SCK    ->  GPIO 12
CS     ->  GPIO 14
```

### 4. Power

**Battery: 3.7V LiPo**
- 500mAh for ~4-6 hours recording
- 1000mAh for ~8-12 hours recording
- Look for batteries with JST-PH connector

**Charging: TP4056 Module** (~$1) or use a board with built-in charging
- USB-C input
- Handles LiPo charging safely
- Has charge indicator LEDs

**Note:** If using Adafruit ESP32-S3 Feather, charging is built-in.

### 5. Button

**Tactile Push Button** (~$0.10)
- Connect between GPIO and GND
- Use internal pull-up resistor in code
- Recommended: 6x6mm through-hole for prototyping

### 6. LED

**3mm or 5mm LED** with 220Ω resistor
- Or use the onboard LED on most dev boards
- Consider RGB LED (WS2812B) for multiple status colors

## Bill of Materials (BOM) - Prototype

| Component | Quantity | Est. Cost |
|-----------|----------|-----------|
| ESP32-S3 DevKitC-1 | 1 | $10 |
| INMP441 Microphone | 1 | $4 |
| MicroSD Module | 1 | $2 |
| MicroSD Card (32GB) | 1 | $8 |
| TP4056 Charging Module | 1 | $1 |
| 3.7V 1000mAh LiPo | 1 | $8 |
| Tactile Button | 2 | $0.20 |
| LED + Resistor | 1 | $0.10 |
| Breadboard + Jumper Wires | 1 | $5 |
| **Total** | | **~$38** |

## Software/Firmware Stack

### Development Options

**Option 1: Arduino Framework (Recommended for prototyping)**
- Easier to get started
- Lots of libraries available
- Use PlatformIO or Arduino IDE

**Option 2: ESP-IDF (Espressif IoT Development Framework)**
- More control and performance
- Better for production
- Steeper learning curve

### Key Libraries

```
Arduino Framework:
- ESP32-audioI2S      - I2S audio recording
- SD                  - SD card file system
- USB                 - USB Mass Storage
- ESP32 TinyUSB       - Better USB stack

ESP-IDF:
- esp_idf_usb_msc     - USB Mass Storage
- esp_idf_i2s         - I2S driver
- esp_idf_fatfs       - FAT filesystem
```

## Firmware Architecture

```
┌─────────────────────────────────────────────┐
│                  Main Loop                   │
├─────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ Button  │  │ LED     │  │ USB State   │ │
│  │ Handler │  │ Manager │  │ Manager     │ │
│  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       │            │              │         │
├───────┴────────────┴──────────────┴─────────┤
│              Recording Manager               │
│  ┌─────────────────────────────────────────┐│
│  │ States: IDLE -> RECORDING -> SAVING     ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ I2S/Mic  │  │ SD Card  │  │ USB MSC   │ │
│  │ Driver   │  │ Driver   │  │ Driver    │ │
│  └──────────┘  └──────────┘  └───────────┘ │
└─────────────────────────────────────────────┘
```

## Recording Flow

1. **Idle State**
   - LED: Slow pulse (breathing)
   - Waiting for button press

2. **Recording State**
   - LED: Solid on
   - I2S reads audio from mic into buffer
   - Buffer writes to SD card as WAV file
   - Filename: `REC_YYYYMMDD_HHMMSS.wav`

3. **USB Connected**
   - LED: Fast blink
   - Stop any recording
   - Mount SD card as USB Mass Storage
   - PC sees device as removable drive

4. **Low Battery**
   - LED: Red blink
   - Stop recording
   - Safe shutdown

## Audio Format

- **Format:** WAV (PCM)
- **Sample Rate:** 16000 Hz (sufficient for speech)
- **Bit Depth:** 16-bit
- **Channels:** Mono
- **Bitrate:** ~256 kbps
- **Storage:** ~1.9 MB per minute, ~115 MB per hour

## Next Steps

1. **Order components** (see BOM above)
2. **Set up development environment:**
   ```bash
   # Install PlatformIO
   pip install platformio

   # Or use VS Code with PlatformIO extension
   ```
3. **Start with basic examples:**
   - Blink LED
   - Read button
   - Record audio to serial (test mic)
   - Write file to SD card
   - USB Mass Storage mode
4. **Combine into full firmware**

## Project Structure

```
/firmware
├── README.md           # This file
├── platformio.ini      # PlatformIO config
├── src/
│   ├── main.cpp        # Entry point
│   ├── audio.cpp       # I2S microphone handling
│   ├── storage.cpp     # SD card operations
│   ├── usb.cpp         # USB mass storage
│   ├── button.cpp      # Button handling
│   └── led.cpp         # LED status indicators
├── include/
│   ├── config.h        # Pin definitions, constants
│   └── *.h             # Header files
├── lib/                # Local libraries
├── test/               # Unit tests
└── docs/
    ├── schematic.pdf   # Circuit diagram
    └── pinout.md       # Pin assignments
```

## Resources

### Documentation
- [ESP32-S3 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP32-S3 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp32-s3_technical_reference_manual_en.pdf)
- [ESP-IDF Programming Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/)

### Tutorials
- [ESP32 I2S Audio Recording](https://github.com/atomic14/esp32-i2s-mic-test)
- [ESP32-S3 USB Mass Storage](https://github.com/espressif/esp-idf/tree/master/examples/peripherals/usb/device/tusb_msc)
- [INMP441 with ESP32](https://github.com/0015/ThatProject/tree/master/ESP32_MICROPHONE)

### Where to Buy
- **AliExpress** - Cheapest, slow shipping (2-4 weeks)
- **Amazon** - Faster, slightly more expensive
- **Adafruit/SparkFun** - Best documentation, premium price
- **JLCPCB** - For custom PCBs later

## Future Improvements

- [ ] Custom PCB design (KiCad)
- [ ] 3D printed enclosure
- [ ] Voice Activity Detection (VAD) on device
- [ ] Compression (Opus codec) to save storage
- [ ] BLE for wireless transfer
- [ ] Real-time clock (RTC) for accurate timestamps
