'use client'

import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import data from "./data.json";
function Dashboard() {
  return (
    <>
      <div className="flex flex-col gap-4 md:gap-6 ">
        <DataTable data={data}/>
      </div>
    </>
  );
}
export default Dashboard;