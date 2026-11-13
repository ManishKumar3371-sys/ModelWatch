
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts";

/* Shared tooltip style */
const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #ddd8cf",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,.08)",
  fontSize: "12px",
  color: "#1a2b1b"
};

const gridProps = {
  strokeDasharray: "4 4",
  stroke: "#e9e3d8",
  vertical: false
};

const axisStyle = {
  fill: "#7a9079",
  fontSize: 11.5,
  fontFamily: "Inter, sans-serif"
};

function Charts({ type, data }) {
  if (type === "overview") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="sageGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#648f65" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#648f65" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid {...gridProps} />
          <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis domain={[70, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />

          <Area
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="#4a7a4b"
            fill="url(#sageGrad)"
            strokeWidth={2.5}
            dot={{ fill: "#4a7a4b", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "classification") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#4a7a4b" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#4a7a4b" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="f1Grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#d94030" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#d94030" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Area
            type="monotone"
            dataKey="accuracy"
            name="Accuracy (%)"
            stroke="#4a7a4b"
            fill="url(#accGrad)"
            strokeWidth={2.5}
            dot={{ fill: "#4a7a4b", r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="f1"
            name="F1 Score (%)"
            stroke="#d94030"
            fill="url(#f1Grad)"
            strokeWidth={2.5}
            dot={{ fill: "#d94030", r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "regression") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="maeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#a06b10" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#a06b10" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="rmseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#d94030" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#d94030" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Area
            type="monotone"
            dataKey="mae"
            name="MAE"
            stroke="#a06b10"
            fill="url(#maeGrad)"
            strokeWidth={2.5}
            dot={{ fill: "#a06b10", r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="rmse"
            name="RMSE"
            stroke="#d94030"
            fill="url(#rmseGrad)"
            strokeWidth={2.5}
            dot={{ fill: "#d94030", r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "drift-trend") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Line
            type="monotone"
            dataKey="drifted_features"
            name="Drifted Features"
            stroke="#d94030"
            strokeWidth={2.5}
            dot={{ fill: "#d94030", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="total_features"
            name="Total Features"
            stroke="#648f65"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={{ fill: "#648f65", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

export default Charts;
