enum class ControlLoopState { Idle, Running, Stopped };

class ControlLoop {
private:
  int count;
  ControlLoopState state;

public:
  ControlLoop();
  void run();
  int getCount();
};
