class Microphone {
public:
  Microphone(int blckGpioId, int blckDioGpioId, int blckLrclGpioId);

  const unsigned int MIC_BLCK_GPIO_ID = 17;
  const unsigned int MIC_DOUT_GPIO_ID = 16;
  const unsigned int MIC_LRCL_GPIO_ID = 15;

private:
  int blckGpioId;
  int blckDioGpioId;
  int blckLrclGpioId;
};
