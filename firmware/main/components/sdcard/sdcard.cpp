#include "sdcard.h"
#include "driver/sdspi_host.h"
#include "driver/spi_common.h"
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
  };

  ESP_LOGI(TAG, "Initializing SD card");
  ESP_LOGI(TAG, "Using SPI peripheral");

  sdmmc_host_t host = SDSPI_HOST_DEFAULT();

  spi_bus_config_t bus_cfg = {
      .mosi_io_num = mosiGPIO, // DI on SD card
      .miso_io_num = misoGPIO, // DO on SD card
      .sclk_io_num = clkGPIO,
      .quadwp_io_num = -1,
      .quadhd_io_num = -1,
      .max_transfer_sz = 4000,
  };

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
    }
    else {
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
