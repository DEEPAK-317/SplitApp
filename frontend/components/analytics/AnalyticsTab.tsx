"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SpendingTrendChart, CategoryDonutChart, EmptyState } from './Charts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { TrendingUp, PieChart as PieChartIcon, ArrowUpRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalyticsTabProps {
    data: {
        spending_trend: any[];
        category_breakdown: any[];
        top_spenders: any[];
        members: string[]; // List of member names for trend lines
    } | null;
}

export function AnalyticsTab({ data }: AnalyticsTabProps) {
    console.log("AnalyticsTab data:", data);
    
    // Fallback if data is null (though removed blocking check, still need safe access)
    const trends = data?.spending_trend || [];
    const categories = data?.category_breakdown || [];
    const spenders = data?.top_spenders || [];
    const memberNames = data?.members || [];

    return (
        <div className="space-y-6 mt-4">
             {/* 1. Spending Trend (Full Width) */}
             <Card>
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                         <TrendingUp className="h-5 w-5 text-blue-500" />
                         Monthly Spending Trend
                     </CardTitle>
                     <CardDescription>Aggregate expenses and settlements by month for all members</CardDescription>
                 </CardHeader>
                 <CardContent>
                     {trends.length > 0 ? (
                         <SpendingTrendChart data={trends} members={memberNames} />
                     ) : (
                         <EmptyState icon={TrendingUp} message="Not enough data for trends" />
                     )}
                 </CardContent>
             </Card>

            <div className="space-y-6 mt-4 gap-6">


                {/* 3. Top Spenders (Table) */}
                <Card className="flex flex-col">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                             <ArrowUpRight className="h-5 w-5 text-green-500" />
                             Top Spenders
                         </CardTitle>
                         <CardDescription>Total cash outflow (Expenses + Settlements)</CardDescription>
                     </CardHeader>
                     <CardContent className="flex-1">
                         {spenders.length > 0 ? (
                             <ScrollArea className="h-[350px]">
                                 <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead>Member</TableHead>
                                             <TableHead className="text-right">Expenses</TableHead>
                                             <TableHead className="text-right">Settlements</TableHead>
                                             <TableHead className="text-right font-bold">Total</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                         {spenders.map((s, i) => (
                                             <TableRow key={i}>
                                                 <TableCell className="font-medium">
                                                     <div className="flex items-center gap-2">
                                                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                             {i+1}
                                                         </div>
                                                         {s.name}
                                                     </div>
                                                 </TableCell>
                                                 <TableCell className="text-right text-gray-500">${s.expenses_paid}</TableCell>
                                                 <TableCell className="text-right text-gray-500">${s.settlements_paid}</TableCell>
                                                 <TableCell className="text-right font-bold text-green-600">${s.total_paid}</TableCell>
                                             </TableRow>
                                         ))}
                                     </TableBody>
                                 </Table>
                             </ScrollArea>
                         ) : (
                             <EmptyState icon={ArrowUpRight} message="No spending recorded yet" />
                         )}
                     </CardContent>
                </Card>
            </div>
        </div>
    );
}
