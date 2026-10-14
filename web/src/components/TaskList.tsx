import { isOverdue } from "../format";
import type { Task } from "../types";
import { TaskItem } from "./TaskItem";

type Props = {
  tasks: Task[];
  empty: string;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
};

export function TaskList({ tasks, empty, onComplete, onDelete }: Props) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-muted">{empty}</p>;
  }
  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} overdue={isOverdue(task)} onComplete={onComplete} onDelete={onDelete} />
      ))}
    </ul>
  );
}
