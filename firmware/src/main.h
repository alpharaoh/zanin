#include <atomic>
enum class ControlLoopState { Idle, Running, Finished, Stopped };

class Count {
private:
  std::atomic<int> count;
  std::atomic<ControlLoopState> state;

public:
  Count();
  void increment();
  int getCount();
  ControlLoopState getState();
  void setState(ControlLoopState state);
};
