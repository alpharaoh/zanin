#include "sdcard.h"
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "sd_test_io.h"
#include "sdmmc_cmd.h"
#include <string.h>
#include <sys/stat.h>
#include <sys/unistd.h>

const char *MOUNT_POINT = "/sdcard";

static const char *TAG = "zanin-sdcard";

SDCard::SDCard(gpio_num_t doGPIO, gpio_num_t clkGPIO, gpio_num_t diGPIO,
               gpio_num_t csGPIO)
    : doGPIO(doGPIO), clkGPIO(clkGPIO), diGPIO(diGPIO), csGPIO(csGPIO) {

  esp_vfs_fat_sdmmc_mount_config_t mount_config = {
      .format_if_mount_failed = false,
      .max_files = 5,
      .allocation_unit_size = 16 * 1024};

  sdmmc_card_t *card;

  const char mount_point[] = MOUNT_POINT;
  ESP_LOGI(TAG, "Initializing SD card");
}
