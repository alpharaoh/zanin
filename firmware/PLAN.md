# Zanin Firmware Development Plan

## Project Overview

Zanin is a wearable audio recorder that captures conversations throughout the day. Users plug the device into their computer via USB-C, and audio files are transferred for processing by the web application (transcription, speaker identification, semantic search, AI-powered insights).

### The Full Pipeline

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    HARDWARE     │      │   WEB BACKEND   │      │   WEB FRONTEND  │
│    (Firmware)   │      │     (API)       │      │    (Client)     │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ Record audio    │      │ Process audio   │      │ View recordings │
│ Store to SD     │ USB  │ VAD cleaning    │ API  │ Search content  │
│ USB mass storage├─────►│ Transcription   ├─────►│ Ask questions   │
│ LED status      │      │ Speaker ID      │      │ Get insights    │
│ Button control  │      │ Vectorization   │      │                 │
│ Battery mgmt    │      │ AI/RAG answers  │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Hardware Components

### Purchased Components

| Component | Model | Purpose | Specs |
|-----------|-------|---------|-------|
| **Microcontroller** | Waveshare ESP32-S3 (N8R8) | Brain | Dual-core 240MHz, 8MB Flash, 8MB PSRAM, USB-C |
| **Microphone** | Adafruit SPH0645LM4H | Audio capture | I2S digital, 50Hz-15KHz, 65dB SNR |
| **Storage** | Adafruit microSD Breakout+ | File storage | SPI interface, 3.3V/5V compatible |
| **Battery** | 1200mAh 3.7V LiPo | Power | JST-PH connector, ~10hrs recording |
| **Charger** | SparkFun LiPo Charger Plus | Charging & power | Load sharing, USB-C input |
| **Accessories** | Breadboard, jumper wires, 32GB microSD | Prototyping | - |

### Pin Assignments

```
ESP32-S3 Waveshare          SPH0645 Microphone
─────────────────           ──────────────────
3V3  ──────────────────────► VIN (3.3V power)
GND  ──────────────────────► GND
GPIO8  ────────────────────► DOUT (I2S Data)
GPIO9  ────────────────────► LRCLK (I2S Word Select)
GPIO10 ────────────────────► BCLK (I2S Clock)
                             SEL → GND (Left channel)

ESP32-S3 Waveshare          microSD Breakout+
─────────────────           ─────────────────
3V3  ──────────────────────► 3V (or 5V, has regulator)
GND  ──────────────────────► GND
GPIO11 ────────────────────► DI (MOSI)
GPIO12 ────────────────────► CLK (SCK)
GPIO13 ────────────────────► DO (MISO)
GPIO14 ────────────────────► CS (Chip Select)

ESP32-S3 Waveshare          SparkFun LiPo Charger
─────────────────           ─────────────────────
5V (or VIN) ◄──────────────── OUT (power output)
GND  ──────────────────────► GND
                             BATT ←── 1200mAh LiPo Battery (JST)
                             USB-C ←── Charging input

ESP32-S3 Waveshare          Button & LED
─────────────────           ────────────
GPIO0  ────────────────────► Tactile Button (to GND, use internal pullup)
GPIO48 ────────────────────► Onboard RGB LED (or external LED + 220Ω to GND)
```

## Firmware Architecture

### State Machine

```
                              ┌─────────────┐
                              │    BOOT     │
                              └──────┬──────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │                                │
                    ▼                                │
              ┌───────────┐    USB detected    ┌────┴────────┐
         ┌───►│   IDLE    │◄──────────────────►│ USB_STORAGE │
         │    └─────┬─────┘    USB removed     └─────────────┘
         │          │                           (PC sees drive)
         │          │ Button press
         │          ▼
         │    ┌───────────┐
         │    │ RECORDING │ ──── Button press ────┐
         │    └─────┬─────┘                       │
         │          │                             │
         │          │ Error (SD full, etc.)       │
         │          ▼                             │
         │    ┌───────────┐                       │
         └────┤   ERROR   │◄──────────────────────┘
              └───────────┘      (if error)

         ┌─────────────┐
         │ LOW_BATTERY │ ──── Can interrupt any state
         └─────────────┘      Forces safe shutdown
```

### Core Modules

```
firmware/
├── src/
│   ├── main.cpp              # Entry point, state machine
│   ├── audio/
│   │   ├── i2s.cpp           # I2S driver for SPH0645 mic
│   │   ├── i2s.h
│   │   ├── recorder.cpp      # Recording logic, WAV file creation
│   │   └── recorder.h
│   ├── storage/
│   │   ├── sd.cpp            # SD card initialization, file ops
│   │   ├── sd.h
│   │   ├── wav.cpp           # WAV file format handling
│   │   └── wav.h
│   ├── usb/
│   │   ├── msc.cpp           # USB Mass Storage Class
│   │   └── msc.h
│   ├── power/
│   │   ├── battery.cpp       # Battery monitoring (ADC)
│   │   └── battery.h
│   ├── ui/
│   │   ├── button.cpp        # Button handling with debounce
│   │   ├── button.h
│   │   ├── led.cpp           # LED patterns for status
│   │   └── led.h
│   └── config.h              # Pin definitions, constants
├── include/
├── lib/
├── test/
└── platformio.ini
```

## Audio Specifications

| Parameter | Value | Reason |
|-----------|-------|--------|
| Sample Rate | 16000 Hz | Sufficient for speech, matches Deepgram |
| Bit Depth | 16-bit | Standard, good quality |
| Channels | Mono | Single mic, saves storage |
| Format | WAV (PCM) | Universal, no decoding needed |
| File Size | ~1.9 MB/min | 32GB card = ~280 hours |

### WAV File Structure

```
WAV File: REC_20250622_143052.wav
├── RIFF Header (12 bytes)
│   ├── "RIFF" marker
│   ├── File size
│   └── "WAVE" format
├── fmt Chunk (24 bytes)
│   ├── Audio format (PCM = 1)
│   ├── Channels (1 = mono)
│   ├── Sample rate (16000)
│   ├── Byte rate
│   ├── Block align
│   └── Bits per sample (16)
└── data Chunk (variable)
    ├── "data" marker
    ├── Data size
    └── Raw PCM audio samples...
```

## LED Status Patterns

| State | Pattern | Visual |
|-------|---------|--------|
| IDLE | Slow pulse (100ms on, 2900ms off) | Breathing effect |
| RECORDING | Solid on | Steady light |
| USB_STORAGE | Fast blink (200ms on/off) | Rapid flash |
| ERROR | Very fast blink (100ms on/off) | Frantic flash |
| LOW_BATTERY | Double blink, pause, repeat | Warning pattern |

## Button Behavior

| Action | State | Result |
|--------|-------|--------|
| Single press | IDLE | Start recording |
| Single press | RECORDING | Stop recording |
| Long press (3s) | Any | Force stop / safe shutdown |
| Double press | IDLE | (Future: toggle WiFi sync) |

## File Naming Convention

```
REC_YYYYMMDD_HHMMSS.wav

Example: REC_20250622_143052.wav
         │   │       │
         │   │       └── Time: 14:30:52
         │   └────────── Date: 2025-06-22
         └────────────── Prefix: Recording
```

Note: Without RTC, timestamps start from boot time. Files are still unique and sequential.

## USB Mass Storage Behavior

When USB is connected:

1. **Detect USB VBUS** (5V on USB line)
2. **Stop any active recording** (finalize WAV header)
3. **Unmount SD from firmware** (release SPI)
4. **Initialize USB MSC** (TinyUSB stack)
5. **Expose SD card as removable drive**
6. **LED: Fast blink pattern**

When USB is disconnected:

1. **Detect VBUS loss**
2. **Deinitialize USB MSC**
3. **Remount SD card** (SPI)
4. **Return to IDLE state**
5. **LED: Slow pulse pattern**

## Power Management

### Battery Monitoring

```cpp
// Voltage divider on ADC pin
// 4.2V (full) → ~2.1V after divider → ADC reading
// 3.3V (empty) → ~1.65V after divider → ADC reading

Battery Level:
  100% = 4.2V
   75% = 3.9V
   50% = 3.7V
   25% = 3.5V
    0% = 3.3V (shutdown threshold)
```

### Low Power Modes

| Mode | When | Power |
|------|------|-------|
| Active | Recording | ~80mA |
| Idle | Waiting | ~20mA (WiFi off) |
| Light Sleep | Long idle | ~2mA |
| Deep Sleep | Not implemented yet | ~10µA |

## Integration with Web Application

### Audio File Format Expected by Backend

The web API (`/web/services/api`) expects:

```
POST /v1/recordings
Content-Type: multipart/form-data

- audio: WAV file (PCM, 16-bit, 16kHz, mono)
```

### Processing Pipeline (Backend)

```
1. Upload audio file
2. VAD (Voice Activity Detection) - removes silence
3. Deepgram transcription - speech to text
4. Speaker identification (SID) - who's speaking
5. Title generation - LLM summarizes content
6. Vectorization - embeddings for semantic search
7. Storage - S3 (audio), PostgreSQL (metadata), Pinecone (vectors)
```

### Search & Query (Backend)

```
GET /v1/recordings/search?query=marketing%20budget
- Semantic search across all recordings
- Returns matching transcript chunks

GET /v1/recordings/ask?question=What%20did%20we%20decide%20about%20Q1%20goals
- RAG-powered Q&A
- Searches recordings, uses LLM to answer
```

## Development Phases

### Phase 1: Basics (Week 1-2)
- [ ] Blink LED on ESP32-S3
- [ ] Read button with debounce
- [ ] Serial output for debugging
- [ ] Understand PlatformIO workflow

### Phase 2: Storage (Week 2-3)
- [ ] Initialize SD card (SPI)
- [ ] Create and write files
- [ ] Read files back
- [ ] Handle SD card errors gracefully

### Phase 3: Audio (Week 3-4)
- [ ] Configure I2S for SPH0645
- [ ] Read audio samples to buffer
- [ ] Print audio levels to Serial (verify mic works)
- [ ] Write audio to SD as raw PCM

### Phase 4: WAV Files (Week 4-5)
- [ ] Create proper WAV headers
- [ ] Write complete WAV files
- [ ] Finalize header when recording stops
- [ ] Verify files play on PC

### Phase 5: USB Mass Storage (Week 5-6)
- [ ] Initialize TinyUSB MSC
- [ ] Detect USB connection (VBUS)
- [ ] Expose SD card as USB drive
- [ ] Handle mount/unmount gracefully

### Phase 6: Integration (Week 6-7)
- [ ] Full state machine
- [ ] LED patterns for all states
- [ ] Button controls
- [ ] Error handling

### Phase 7: Power (Week 7-8)
- [ ] Battery voltage monitoring
- [ ] Low battery warning
- [ ] Safe shutdown
- [ ] Power optimization

### Phase 8: Polish (Week 8+)
- [ ] Stress testing
- [ ] Edge cases
- [ ] Documentation
- [ ] Enclosure design

## Key Libraries

```ini
# platformio.ini
lib_deps =
    # SD card
    SPI
    SD

    # Audio - use ESP-IDF I2S driver directly
    # (no external lib needed, built into ESP32 Arduino core)

    # USB Mass Storage
    # TinyUSB (included in ESP32-S3 Arduino core)
```

## Useful Resources

### ESP32-S3 Documentation
- [ESP32-S3 Datasheet](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)
- [ESP-IDF I2S Driver](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/i2s.html)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)

### Example Projects
- [ESP32 I2S Microphone Recording](https://github.com/atomic14/esp32-i2s-mic-test)
- [ESP32-S3 USB MSC Example](https://github.com/espressif/arduino-esp32/tree/master/libraries/USB/examples/USBMSC)
- [TinyUSB MSC](https://github.com/hathach/tinyusb/tree/master/examples/device/msc_dual_lun)

### Component Datasheets
- [SPH0645LM4H Microphone](https://cdn-learn.adafruit.com/assets/assets/000/049/977/original/sph0645lm4h-b.pdf)
- [Waveshare ESP32-S3 Wiki](https://www.waveshare.com/wiki/ESP32-S3-DEV-KIT-N8R8)

## Common Pitfalls to Avoid

1. **I2S Configuration**: ESP32 I2S API changed between versions. Use the ESP-IDF 5.x style if on recent Arduino core.

2. **SD Card SPI Speed**: Start slow (1MHz), increase after it works. Some cards are picky.

3. **USB + SD Conflict**: Can't use SD via SPI while USB MSC is active. Must unmount first.

4. **WAV Header Size**: Must go back and update file size in header after recording stops.

5. **Buffer Sizes**: I2S DMA buffers must be sized correctly or you'll get audio glitches.

6. **Power Sequencing**: SD card needs stable power before init. Add small delay after boot.

## Notes for Claude Agent

When helping with firmware development:

1. **Framework**: Using Arduino framework on PlatformIO (not ESP-IDF directly, though ESP-IDF APIs are available)

2. **Board**: Waveshare ESP32-S3-DEV-KIT-N8R8 (compatible with `esp32-s3-devkitc-1` in PlatformIO)

3. **USB Mode**: Native USB (not UART bridge) - set `ARDUINO_USB_MODE=1`

4. **Memory**: 8MB PSRAM available - can use for large audio buffers

5. **Voltage**: Everything is 3.3V logic - no level shifters needed

6. **Context**: The goal is to record audio and make it available via USB. The complex processing (transcription, AI) happens on the web backend, not on the device.

7. **User Level**: Complete beginner to hardware/embedded. Explain concepts, don't assume knowledge.
