export type Lesson = {
  id: string;
  number: number;
  title: string;
  goal: string;
  click: string;
  file: string;
  exercise: string;
  hint: string;
  check: string;
};

export const lessons: Lesson[] = [
  {
    id: "first-request",
    number: 1,
    title: "Your first request",
    goal: "See a Go handler run because you opened the list.",
    click: "Stay on App. The page loads with GET /api/tasks?all=true. In the panel, find the method, the status 200, and the handler name handleList.",
    file: "internal/api/server.go — handleList and routes",
    exercise:
      "In routes, the pattern is the string \"GET /api/tasks\". Say out loud which part is the method and which part is the path. Then click Check health and compare handleHealth with handleList.",
    hint: "ServeMux patterns put the method first. handleHealth writes a struct. handleList writes a slice.",
    check: "You can point at the LEARN(http-handler) line inside handleList and at the matching concept card.",
  },
  {
    id: "creating-a-task",
    number: 2,
    title: "Creating a task",
    goal: "Watch a JSON body become a Task struct.",
    click: "Add a task with a title and a due date. Select the POST trace. Compare the request JSON with the response JSON.",
    file: "internal/api/server.go — handleCreate, and internal/task/task.go — Task and List.Add",
    exercise:
      "Find the json tag that turns the Go field CreatedAt into createdAt. Change nothing yet. Notice that the response has an id the request did not send.",
    hint: "The tag is on the struct in task.go. NextID in List is what becomes that id.",
    check: "You can name the struct tag, the decoder in handleCreate, and the line that appends to the slice.",
  },
  {
    id: "errors",
    number: 3,
    title: "Errors",
    goal: "Trigger a 400 and a 404 and see errors.Is decide the status.",
    click: "Submit the add form with an empty title. Then delete a task and hit the API again is not required: open a missing id by running curl -s -i http://127.0.0.1:8080/api/tasks/999 in a terminal, or delete a task that was already deleted if you still have its trace.",
    file: "internal/task/task.go — ErrEmptyTitle and ErrNotFound. internal/api/server.go — writeTaskErr",
    exercise:
      "Read writeTaskErr. Which sentinel becomes 400, and which becomes 404? Why does the code use errors.Is instead of err == task.ErrNotFound?",
    hint: "Load and Save wrap errors with %w. errors.Is still sees the sentinel through the wrap. A plain == would not.",
    check: "The empty-title trace shows status 400 and the concept errors. A missing id shows 404.",
  },
  {
    id: "pointers-methods",
    number: 4,
    title: "Pointers and methods",
    goal: "See why Complete can change the list the handler loaded.",
    click: "Mark a task done with the checkbox. Open the PATCH trace and the List.Complete snippet under the handler.",
    file: "internal/task/task.go — Complete, Add",
    exercise:
      "Complete sets DoneAt = &now. What would JSON look like if DoneAt were a plain time.Time instead of a pointer? Then explain why Add's receiver is *List and not List.",
    hint: "A nil pointer plus omitempty drops doneAt until the task is completed. A value receiver would edit a copy.",
    check: "The finished task's JSON includes doneAt, and you can point at the pointer receiver on Add or Complete.",
  },
  {
    id: "interfaces",
    number: 5,
    title: "Interfaces",
    goal: "See that the handlers call Store, not JSONFile.",
    click: "Add a task, then look at update in the handler's call path. The method is Save on the Store interface.",
    file: "internal/store/store.go and internal/store/jsonfile.go",
    exercise:
      "Write a MemoryStore in internal/store with an in-memory *task.List, Lock if you share it, and Load and Save. Point the server at it from a test. Do not change the handlers.",
    hint: "Start from var _ Store = (*MemoryStore)(nil). The compiler lists every method you still owe. JSONFile.Load shows the empty-list shape to return.",
    check: "go test ./internal/store/ passes, and the blank assignment compiles, which means your type is a Store.",
  },
  {
    id: "concurrency",
    number: 6,
    title: "The mutex and the race detector",
    goal: "Understand the lock around load-modify-save.",
    click: "Add two tasks quickly. Each POST is a separate request. The server handles them at the same time up to the lock.",
    file: "internal/api/server.go — update. internal/api/server_test.go — TestConcurrentCreate",
    exercise:
      "Run go test -race ./internal/api/ -run TestConcurrentCreate -v. Read the LEARN(mutex) comment and write down the bug it prevents, in one sentence.",
    hint: "Both requests would read the same NextID, and the later Save would erase the earlier task. The test store has no lock of its own, so the detector is watching the server's mutex.",
    check: "The test passes under -race, and the sentence you wrote mentions a lost update or a duplicate id.",
  },
  {
    id: "goroutines-tickers",
    number: 7,
    title: "Goroutines and tickers",
    goal: "See work that runs beside the request, on a timer.",
    click: "Add a task due yesterday (pick an earlier date). Within a minute the API process logs an overdue line. You do not click anything for that log. The snippet is Remind.",
    file: "internal/api/server.go — Remind. cmd/todo/main.go — the go srv.Remind line",
    exercise:
      "Find the channel named ticks and the select that also watches ctx.Done(). What happens to the goroutine when you stop make dev with Ctrl-C?",
    hint: "signal.NotifyContext cancels on interrupt. Remind's select receives from ctx.Done and returns. The inner ticker goroutine does the same.",
    check: "You can point at go srv.Remind, at NewTicker, and at the cancel path.",
  },
  {
    id: "testing",
    number: 8,
    title: "Table-driven tests",
    goal: "Read a test that already covers Add, then extend it.",
    click: "Open internal/task/task_test.go. You do not need the web app for this one. The glossary cards for testing, table-tests, and httptest describe the shape.",
    file: "internal/task/task_test.go — TestAdd. internal/api/server_test.go for httptest",
    exercise:
      "Add a table row whose title is longer than you would type in the form, and assert the stored title matches. Run go test ./internal/task/ -run TestAdd.",
    hint: "Copy the row named title. t.Run prints the row name when it fails. A wrong wantErr fails on errors.Is.",
    check: "go test ./internal/task/ passes, and your new row is visible in the test output with go test -v -run TestAdd.",
  },
];
