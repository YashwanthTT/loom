import {type CliRenderer, BoxRenderable, TextRenderable, t, fg, bold} from "@opentui/core"
export type StepName = "Tester"|"Implementer"|"QC"|"Evaluator"
export type StepStatus = "Passed"|"Running"|"Pending"
export interface AgentStep{
    name:StepName
    status:StepStatus
}
export interface SideBarState{
    version:string
    subphase:string 
    iteration:{current:number;max:number }
    steps:AgentStep[]
    logs:string[]
    maxloglines?:number

}
const defaultState: SideBarState = {
    version:"v1",
    subphase:"phase o.1(Init)",
    iteration: { current: 1, max: 4 },
    steps:[
        {name:"Tester",status:"Pending"},
        {name:"Implementer",status:"Pending"},
        {name:"QC",status:"Pending"},
        {name:"Evaluator",status:"Pending"},
    ],
    logs: [],
    maxloglines: 6,
}
function formatstep(step:AgentStep,index:number){
    const bullet = step.status === "Pending" ? "○":"●"
    const label = `${bullet} ${index+1},${step.name}`
    const padded = label.padEnd(20," ")
    if(step.status === "Passed"){
         return `${padded}(Passed)`
    }
    if(step.status === "Running"){
        return `${padded}(Running...)`
    }
    return `${padded}(Pending)`
}
export interface Sidebar {
    container:BoxRenderable 
    update:(partial:Partial<SideBarState>)=>void
    pushlog:(line:string)=>void
}
export function createSideBar(renderer:CliRenderer,initial: Partial<SideBarState>={}): Sidebar{
let state: SideBarState={...defaultState,...initial}
  const container = new BoxRenderable(renderer, {
    id: "sidebar-root",
    width: 42,
    height: "auto",
    flexDirection: "column",
    borderStyle: "single",
    border: true,
  })
  const headerBox = new BoxRenderable(renderer, {
    id: "sidebar-header",
    width: "auto",
    height: 3,
    borderStyle: "single",
    border: true,
    alignItems: "center",
    justifyContent: "center",
  })
  const headerText = new TextRenderable(renderer, {
    id: "sidebar-header-text",
    content: `AGENT ORCHESTRATOR   [${state.version}]`,
    fg: "#ffffff",
  })
  headerBox.add(headerText)
  const subphaseBox = new BoxRenderable(renderer, {
    id: "sidebar-subphase",
    width: "auto",
    height: 3,
    borderStyle: "single",
    border: true,
    alignItems: "center",
  })
  const subphaseText = new TextRenderable(renderer, {
    id: "sidebar-subphase-text",
    content: `SUBPHASE: ${state.subphase}`,
    fg: "#e2e8f0",
  })
  subphaseBox.add(subphaseText)
  const iterationBox = new BoxRenderable(renderer, {
    id: "sidebar-iteration",
    width: "auto",
    height: 3,
    borderStyle: "single",
    border: true,
    alignItems: "center",
  })
  const iterationText = new TextRenderable(renderer, {
    id: "sidebar-iteration-text",
    content: `ITERATION: [ ${state.iteration.current} / ${state.iteration.max} ]`,
    fg: "#e2e8f0",
  })
  iterationBox.add(iterationText)
  const stepsBox = new BoxRenderable(renderer, {
    id: "sidebar-steps",
    width: "auto",
    height: "auto",
    borderStyle: "single",
    border: true,
    flexDirection: "column",
    padding: 1,
  })
  const stepsTitle = new TextRenderable(renderer, {
    id: "sidebar-steps-title",
    content: "ACTIVE AGENT STATE",
    fg: "#94a3b8",
  })
  const stepsText = new TextRenderable(renderer, {
    id: "sidebar-steps-text",
    content: state.steps.map((s, i) => formatstep(s, i)).join("\n"),
  })
  stepsBox.add(stepsTitle)
  stepsBox.add(stepsText)
  const logsBox = new BoxRenderable(renderer, {
    id: "sidebar-logs",
    width: "auto",
    height: "auto",
    borderStyle: "single",
    border: true,
    flexDirection: "column",
    padding: 1,
  })
  const logsTitle = new TextRenderable(renderer, {
    id: "sidebar-logs-title",
    content: "LIVE PI-SESSION LOGS",
    fg: "#94a3b8",
  })
  const logsText = new TextRenderable(renderer, {
    id: "sidebar-logs-text",
    content: renderLogs(state),
    fg: "#38bdf8",
  })
  logsBox.add(logsTitle)
  logsBox.add(logsText)
 
  container.add(headerBox)
  container.add(subphaseBox)
  container.add(iterationBox)
  container.add(stepsBox)
  container.add(logsBox)
   
  function renderLogs(s:SideBarState):string{
    const limit = s.maxloglines ?? 6
    return s.logs.slice(0,limit).join("\n")
  }
  function update(partial: Partial<SideBarState>) {
    state = { ...state, ...partial }
 
    headerText.content = `AGENT ORCHESTRATOR   [${state.version}]`
    subphaseText.content = `SUBPHASE: ${state.subphase}`
    iterationText.content = `ITERATION: [ ${state.iteration.current} / ${state.iteration.max} ]`
    stepsText.content = state.steps.map((s, i) => formatstep(s, i)).join("\n")
    logsText.content = renderLogs(state)
  }
  function pushLog(line: string) {
    update({ logs: [line, ...state.logs] })
  }
 
  return { container, update, pushlog: pushLog }

}
