#include "components/led/led.h"
#include "components/mic/mic.h"
#include "components/sdcard/sdcard.h"
#include "components/wifi/wifi.h"
#include "services/sync/sync_service.h"
#include <cmath>
#include <cstring>
#include <stdio.h>
#include <sys/stat.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "zanin-main";

static const uint32_t SAMPLE_RATE = 16000;
static const uint32_t BITS_PER_SAMPLE = 32;
static const uint32_t NUM_CHANNELS = 2;
static const uint32_t RECORDING_DURATION_SEC = 10;
static const size_t CHUNK_SIZE = 4096;
static const size_t RECORDING_TASK_STACK_SIZE = 16384;

struct WavHeader {
  char riff[4] = {'R', 'I', 'F', 'F'};
  uint32_t fileSize;
  char wave[4] = {'W', 'A', 'V', 'E'};
  char fmt[4] = {'f', 'm', 't', ' '};
  uint32_t fmtSize = 16;
  uint16_t audioFormat = 1;
  uint16_t numChannels;
  uint32_t sampleRate;
  uint32_t byteRate;
  uint16_t blockAlign;
  uint16_t bitsPerSample;
  char data[4] = {'d', 'a', 't', 'a'};
  uint32_t dataSize;
};

void writeWavHeader(FILE *file, uint32_t dataSize) {
  WavHeader header;
  header.numChannels = NUM_CHANNELS;
  header.sampleRate = SAMPLE_RATE;
  header.bitsPerSample = BITS_PER_SAMPLE;
  header.blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  header.byteRate = SAMPLE_RATE * header.blockAlign;
  header.dataSize = dataSize;
  header.fileSize = dataSize + sizeof(WavHeader) - 8;

  fseek(file, 0, SEEK_SET);
  fwrite(&header, sizeof(WavHeader), 1, file);
}

float calculateRMS(int32_t *samples, size_t numSamples) {
  if (numSamples == 0) {
    return 0.0f;
  }

  double sumSquares = 0.0;
  for (size_t i = 0; i < numSamples; i++) {
    double normalized = static_cast<double>(samples[i]) / INT32_MAX;
    sumSquares += normalized * normalized;
  }

  return static_cast<float>(sqrt(sumSquares / numSamples));
}

void printAudioLevel(float rms) {
  int level = static_cast<int>(rms * 50);
  if (level > 50) {
    level = 50;
  }

  char bar[52];
  for (int i = 0; i < 50; i++) {
    bar[i] = (i < level) ? '#' : '-';
  }
  bar[50] = '\0';

  float db = (rms > 0) ? 20.0f * log10f(rms) : -60.0f;
  ESP_LOGI(TAG, "Level: [%s] %.1f dB", bar, db);
}

struct RecordingTaskParams {
  sync::SyncService *syncService;
};

static void recordingTaskFunc(void *pvParameters);

// GPIO Configuration
const gpio_num_t LED_GPIO_ID = GPIO_NUM_38;

const gpio_num_t MIC_DOUT_GPIO_ID = GPIO_NUM_15;
const gpio_num_t MIC_BLCK_GPIO_ID = GPIO_NUM_16;
const gpio_num_t MIC_LRCL_GPIO_ID = GPIO_NUM_17;

const gpio_num_t SD_CARD_DO_GPIO_ID = GPIO_NUM_35;
const gpio_num_t SD_CARD_CLK_GPIO_ID = GPIO_NUM_36;
const gpio_num_t SD_CARD_DI_GPIO_ID = GPIO_NUM_37;
const gpio_num_t SD_CARD_CS_GPIO_ID = GPIO_NUM_39;

extern "C" void app_main() {
  ESP_LOGI(TAG, "=== Zanin Firmware Starting ===");

  // Initialize SD Card (required for recordings storage)
  ESP_LOGI(TAG, "Initializing SD card...");
  SDCard sdcard(SD_CARD_DO_GPIO_ID, SD_CARD_CLK_GPIO_ID, SD_CARD_DI_GPIO_ID,
                SD_CARD_CS_GPIO_ID);

  if (!sdcard.isMounted()) {
    ESP_LOGE(TAG, "SD card mount failed! Sync service cannot operate.");
    return;
  }
  ESP_LOGI(TAG, "SD card mounted successfully");

  // Initialize WiFi subsystem (does not connect yet)
  ESP_LOGI(TAG, "Initializing WiFi subsystem...");
  Wifi wifi;
  if (!wifi.isInitialized()) {
    ESP_LOGE(TAG, "WiFi initialization failed!");
    return;
  }
  ESP_LOGI(TAG, "WiFi subsystem initialized");

  // Configure sync service
  sync::SyncConfig syncConfig;
  syncConfig.syncIntervalSeconds = 3600; // 1 hour
  syncConfig.serverBaseUrl = "http://192.168.0.105:8081";
  syncConfig.uploadEndpoint = "/v1/recordings";
  syncConfig.recordingsDir = "/sdcard/recordings";
  syncConfig.processedLogFile = "/sdcard/.processed";
  syncConfig.maxRetries = 3;
  syncConfig.retryDelayMs = 5000;

  // Create sync service
  sync::SyncService syncService(syncConfig, wifi);

  ESP_LOGI(TAG, "=== Starting Main Loop ===");
  ESP_LOGI(TAG, "Sync interval: %lu seconds", syncConfig.syncIntervalSeconds);

  struct stat st;
  if (stat("/sdcard/recordings", &st) != 0) {
    mkdir("/sdcard/recordings", 0775);
    ESP_LOGI(TAG, "Created recordings directory");
  }

  static RecordingTaskParams taskParams;
  taskParams.syncService = &syncService;

  xTaskCreate(recordingTaskFunc, "recording_task", RECORDING_TASK_STACK_SIZE,
              &taskParams, 5, NULL);

  while (true) {
    vTaskDelay(pdMS_TO_TICKS(10000));
  }
}

static void recordingTaskFunc(void *pvParameters) {
  RecordingTaskParams *params =
      static_cast<RecordingTaskParams *>(pvParameters);

  Microphone mic =
      Microphone(MIC_BLCK_GPIO_ID, MIC_DOUT_GPIO_ID, MIC_LRCL_GPIO_ID);

  mic.start();

  uint8_t *audioBuffer = new uint8_t[CHUNK_SIZE];
  uint32_t recordingNumber = 0;

  const uint32_t totalBytesPerRecording =
      SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8) * RECORDING_DURATION_SEC;

  ESP_LOGI(TAG, "=== Starting Recording Task ===");
  ESP_LOGI(TAG, "Recording duration: %lu seconds", RECORDING_DURATION_SEC);
  ESP_LOGI(TAG, "Bytes per recording: %lu", totalBytesPerRecording);

  while (true) {
    char filename[64];
    snprintf(filename, sizeof(filename), "/sdcard/recordings/rec_%05lu.wav",
             recordingNumber);

    ESP_LOGI(TAG, "--- Starting recording %lu: %s ---", recordingNumber,
             filename);

    FILE *wavFile = fopen(filename, "wb");
    if (wavFile == NULL) {
      ESP_LOGE(TAG, "Failed to open file for writing: %s", filename);
      vTaskDelay(pdMS_TO_TICKS(1000));
      continue;
    }

    fseek(wavFile, sizeof(WavHeader), SEEK_SET);

    uint32_t totalBytesWritten = 0;
    uint32_t chunkCount = 0;

    while (totalBytesWritten < totalBytesPerRecording) {
      size_t bytesRead = 0;
      esp_err_t err = mic.read(audioBuffer, CHUNK_SIZE, &bytesRead, 1000);

      if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to read from microphone: %s",
                 esp_err_to_name(err));
        break;
      }

      if (bytesRead > 0) {
        fwrite(audioBuffer, 1, bytesRead, wavFile);
        totalBytesWritten += bytesRead;

        size_t numSamples = bytesRead / sizeof(int32_t);
        float rms =
            calculateRMS(reinterpret_cast<int32_t *>(audioBuffer), numSamples);

        if (chunkCount % 10 == 0) {
          float progress = (static_cast<float>(totalBytesWritten) /
                            totalBytesPerRecording) *
                           100.0f;
          ESP_LOGI(TAG, "Recording progress: %.1f%%", progress);
          printAudioLevel(rms);
        }

        chunkCount++;
      }
    }

    writeWavHeader(wavFile, totalBytesWritten);
    fclose(wavFile);

    ESP_LOGI(TAG, "Recording complete: %s (%lu bytes)", filename,
             totalBytesWritten);

    recordingNumber++;

    ESP_LOGI(TAG, "--- Performing sync ---");
    int uploadedCount = params->syncService->performSync();

    if (params->syncService->wasLastSyncSuccessful()) {
      ESP_LOGI(TAG, "Sync completed successfully. Uploaded %d file(s)",
               uploadedCount);
    }
    else {
      ESP_LOGW(TAG, "Sync completed with errors. Uploaded %d file(s)",
               uploadedCount);
    }
  }

  delete[] audioBuffer;
  vTaskDelete(NULL);
}
