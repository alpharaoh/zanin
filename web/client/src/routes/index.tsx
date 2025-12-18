import { useGetUser } from '@/api';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const { data: user } = useGetUser(1, { name: "zanin" });

  console.log(user)
  return <div>User: {JSON.stringify(user?.data)}</div>;
}
