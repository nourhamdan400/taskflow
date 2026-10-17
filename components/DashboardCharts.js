"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLORS = [
  "var(--chart-done)",
  "var(--chart-progress)",
  "var(--chart-pending)",
];

const SAMPLE_STATUS = [
  { name: "Completed", value: 12 },
  { name: "In Progress", value: 5 },
  { name: "Pending", value: 8 },
];

const SAMPLE_PROJECTS = [
  { name: "Website", tasks: 14 },
  { name: "Mobile app", tasks: 10 },
  { name: "Marketing", tasks: 7 },
  { name: "Operations", tasks: 5 },
];

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--border)",
  borderRadius: 8,
  color: "var(--text)",
};

export default function DashboardCharts({ tasks, projects }) {
  const hasLiveData = tasks.length > 0;
  const statusData = hasLiveData
    ? [
        {
          name: "Completed",
          value: tasks.filter((task) => task.status === "done").length,
        },
        {
          name: "In Progress",
          value: tasks.filter((task) => task.status === "in_progress").length,
        },
        {
          name: "Pending",
          value: tasks.filter((task) => task.status === "todo").length,
        },
      ]
    : SAMPLE_STATUS;
  const projectData = hasLiveData
    ? projects
        .map((project) => ({
          name: project.name,
          tasks: tasks.filter((task) => task.projectId === project.id).length,
        }))
        .sort((a, b) => b.tasks - a.tasks)
        .slice(0, 8)
    : SAMPLE_PROJECTS;

  return (
    <section className="analytics-grid" aria-label="Project analytics">
      <article className="card analytics-card">
        <div className="analytics-heading">
          <div>
            <h2>Task completion</h2>
            <p className="muted">Current status across all projects</p>
          </div>
          {!hasLiveData && <span className="sample-badge">Sample preview</span>}
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius="57%"
                outerRadius="78%"
                paddingAngle={3}
                stroke="none"
              >
                {statusData.map((item, index) => (
                  <Cell key={item.name} fill={STATUS_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-summary">
          {hasLiveData ? `${tasks.length} total tasks` : "Example distribution"}
        </p>
      </article>

      <article className="card analytics-card">
        <div className="analytics-heading">
          <div>
            <h2>Tasks by project</h2>
            <p className="muted">Compare workload across workspaces</p>
          </div>
          {!hasLiveData && <span className="sample-badge">Sample preview</span>}
        </div>
        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={projectData}
              margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
            >
              <CartesianGrid
                stroke="var(--chart-grid)"
                vertical={false}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={52}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="tasks"
                name="Tasks"
                fill="var(--chart-bar)"
                radius={[5, 5, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="chart-summary">
          {hasLiveData
            ? `${projectData.length} projects shown`
            : "Example workload"}
        </p>
      </article>
    </section>
  );
}
