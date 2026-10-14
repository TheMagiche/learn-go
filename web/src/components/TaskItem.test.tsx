import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskItem } from "./TaskItem";
import type { Task } from "../types";

const task: Task = {
  id: 3,
  title: "Buy milk",
  done: false,
  createdAt: "2026-10-14T00:00:00Z",
  due: "2026-10-20T23:59:59Z",
};

describe("TaskItem", () => {
  it("completes and deletes a task", () => {
    const onComplete = vi.fn();
    const onDelete = vi.fn();
    render(<TaskItem task={task} overdue={false} onComplete={onComplete} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark Buy milk done" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Buy milk" }));
    expect(onComplete).toHaveBeenCalledWith(3);
    expect(onDelete).toHaveBeenCalledWith(3);
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("does not offer complete on a finished task", () => {
    const onComplete = vi.fn();
    render(
      <TaskItem task={{ ...task, done: true }} overdue={false} onComplete={onComplete} onDelete={vi.fn()} />,
    );
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
  });
});
