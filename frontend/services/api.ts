const API_URL = "http://localhost:8000";

let TOKEN = "";

if (typeof window !== "undefined") {
    TOKEN = localStorage.getItem("token") || "";
}

export function setToken(token: string) {
    TOKEN = token;
    localStorage.setItem("token", token);
}

export function getToken() {
    return TOKEN;
}

export function logout() {
    TOKEN = "";
    localStorage.removeItem("token");
    window.location.href = "/login";
}

async function request(url: string, options: any = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (TOKEN) {
        headers["Authorization"] = `Bearer ${TOKEN}`;
    }

    const res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        logout(); // Auto logout on 401
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown Error" }));
        throw new Error(err.detail || "Request failed");
    }
    return res.json();
}

// Auth
export const login = (username: string, password: string) => request("/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password })
});
export const register = (name: string, email: string, password: string) => request("/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
export const getMe = () => request("/users/me");

// Groups & Invites
export const fetchGroups = () => request("/groups/");
export const createGroup = (name: string) => request("/groups/", { method: "POST", body: JSON.stringify({ name }) });
export const fetchGroupDetails = (id: number) => request(`/groups/${id}`);
export const fetchGroupExpenses = (id: number) => request(`/groups/${id}/expenses`);
export const fetchGroupSettlements = (id: number) => request(`/groups/${id}/settlements`);
export const fetchGroupBalances = (id: number) => request(`/groups/${id}/balances`);
export const fetchMyInvites = () => request("/invites/");

// Actions
export const sendInvite = (groupId: number, email: string) => request(`/groups/${groupId}/invite`, { method: "POST", body: JSON.stringify({ email }) });
export const acceptInvite = (id: number) => request(`/invites/${id}/accept`, { method: "POST" });
export const rejectInvite = (id: number) => request(`/invites/${id}/reject`, { method: "POST" });
export const revokeInvite = (groupId: number, id: number) => request(`/groups/${groupId}/invites/${id}/revoke`, { method: "POST" });
export const removeMember = (groupId: number, userId: number) => request(`/groups/${groupId}/members/${userId}`, { method: "DELETE" });

export const createExpense = (data: any) => request("/expenses/", { method: "POST", body: JSON.stringify(data) });
export const updateExpense = (id: number, data: any) => request(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteExpense = (id: number) => request(`/expenses/${id}`, { method: "DELETE" });
export const declineExpenseShare = (id: number) => request(`/expenses/${id}/decline`, { method: "POST" });
export const payExpenseShare = (id: number) => request(`/expenses/${id}/pay`, { method: "POST" });

export const settleBalance = (data: any) => request("/expenses/settle", { method: "POST", body: JSON.stringify(data) });
export const updateSettlementStatus = (id: number, status: string) => request(`/expenses/settlements/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });

export const updateGroup = (id: number, data: any) => request(`/groups/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteGroup = (id: number) => request(`/groups/${id}`, { method: "DELETE" });
export const fetchGroupAnalytics = (id: number, month?: number, year?: number) => {
    let url = `/groups/${id}/analytics`;
    const params = new URLSearchParams();
    if (month) params.append("month", month.toString());
    if (year) params.append("year", year.toString());
    if (params.toString()) url += `?${params.toString()}`;
    return request(url);
};
