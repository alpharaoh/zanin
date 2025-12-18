import { useGetUser } from "@/api";

export function App() {
  const { data: user } = useGetUser(1, { name: "zanin" });

  console.log(user)
  return <div>Hello, world</div>;
}

export default App;
