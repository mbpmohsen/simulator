import {trpc} from "@/app/_trpc/client.ts";

const Todos = () => {
    const getTodos = trpc.getTodos.useQuery();

    return <div>
        {JSON.stringify(getTodos, null, 2)}
    </div>
}

export default Todos;