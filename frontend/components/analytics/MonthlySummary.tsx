import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowUpRight, Calendar } from "lucide-react";

interface MonthlySummaryProps {
    data: {
        overall_total: number;
        month_total: number;
        month: string;
    } | null;
}

export function MonthlySummary({ data }: MonthlySummaryProps) {
    if (!data) return null;

    const monthName = new Date(data.month + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">
                        Total Expenses (All Time)
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        ${data.overall_total.toFixed(2)}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        This Month ({monthName})
                    </CardTitle>
                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </CardHeader>
                <CardContent>
                     <div className="text-2xl font-bold">
                        ${data.month_total.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Spending for {monthName}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
