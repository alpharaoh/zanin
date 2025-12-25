#include "sdcard.h"
#include "driver/sdspi_host.h"
#include "driver/spi_common.h"
#include "esp_intr_alloc.h"
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "sdmmc_cmd.h"

static const char *TAG = "zanin-sdcard";

SDCard::SDCard(gpio_num_t misoGPIO, gpio_num_t clkGPIO, gpio_num_t mosiGPIO,
               gpio_num_t csGPIO)
    : misoGPIO(misoGPIO), clkGPIO(clkGPIO), mosiGPIO(mosiGPIO), csGPIO(csGPIO) {

  esp_vfs_fat_sdmmc_mount_config_t mount_config = {
      .format_if_mount_failed = false,
      .max_files = 5,
      .allocation_unit_size = 16 * 1024,
      .disk_status_check_enable = false,
      .use_one_fat = false,
  };

  ESP_LOGI(TAG, "Initializing SD card");
  ESP_LOGI(TAG, "Using SPI peripheral");

  spi_bus_config_t bus_cfg = {};
  bus_cfg.mosi_io_num = mosiGPIO; // DI on SD card
  bus_cfg.miso_io_num = misoGPIO; // DO on SD card
  bus_cfg.sclk_io_num = clkGPIO;
  bus_cfg.quadwp_io_num = -1;
  bus_cfg.quadhd_io_num = -1;
  bus_cfg.max_transfer_sz = 4000;

  esp_err_t ret = spi_bus_initialize(static_cast<spi_host_device_t>(host.slot),
                                     &bus_cfg, SDSPI_DEFAULT_DMA);
  if (ret != ESP_OK) {
    ESP_LOGE(TAG, "Failed to initialize bus.");
    return;
  }

  sdspi_device_config_t slot_config = SDSPI_DEVICE_CONFIG_DEFAULT();
  slot_config.gpio_cs = csGPIO;
  slot_config.host_id = static_cast<spi_host_device_t>(host.slot);

  ESP_LOGI(TAG, "Mounting filesystem");
  ret = esp_vfs_fat_sdspi_mount(MOUNT_POINT, &host, &slot_config, &mount_config,
                                &card);

  if (ret != ESP_OK) {
    if (ret == ESP_FAIL) {
      ESP_LOGE(TAG, "Failed to mount filesystem.");
    } else {
      ESP_LOGE(TAG,
               "Failed to initialize the card (%s). "
               "Make sure SD card lines have pull-up resistors in place.",
               esp_err_to_name(ret));
    }
    return;
  }

  mounted = true;
  ESP_LOGI(TAG, "Filesystem mounted");
  sdmmc_card_print_info(stdout, card);
}

void SDCard::unmount() {
  // All done, unmount partition and disable SPI peripheral
  esp_vfs_fat_sdcard_unmount(MOUNT_POINT, card);
  ESP_LOGI(TAG, "Card unmounted");

  // deinitialize the bus after all devices are removed
  spi_bus_free(static_cast<spi_host_device_t>(host.slot));
}

esp_err_t SDCard::write(const char *path, const char *data) {
  ESP_LOGI(TAG, "Opening file %s", path);

  char *fullPathWithMountPoint =
      new char[strlen(MOUNT_POINT) + strlen(path) + 1];

  strcpy(fullPathWithMountPoint, MOUNT_POINT);
  strcat(fullPathWithMountPoint, path);
  ESP_LOGI(TAG, "Full path with mount point: %s", fullPathWithMountPoint);

  FILE *f = fopen(fullPathWithMountPoint, "w");

  if (f == NULL) {
    ESP_LOGE(TAG, "Failed to open file for writing");
    return ESP_FAIL;
  }

  fprintf(f, "%s", data);
  fclose(f);
  ESP_LOGI(TAG, "File written");

  return ESP_OK;
}

esp_err_t SDCard::read(const char *path, char *buffer, size_t bufferSize) {
  ESP_LOGI(TAG, "Reading file %s", path);
  FILE *f = fopen(path, "r");

  if (f == NULL) {
    ESP_LOGE(TAG, "Failed to open file for reading");
    return ESP_FAIL;
  }

  fgets(buffer, bufferSize, f);
  fclose(f);

  char *pos = strchr(buffer, '\n');
  if (pos) {
    *pos = '\0';
  }
  ESP_LOGI(TAG, "Read from file: '%s'", buffer);

  return ESP_OK;
}
