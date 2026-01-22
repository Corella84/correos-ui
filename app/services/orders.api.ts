32
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
3const BACKEND_URL = "http://localhost:8000";4
    2
const BACKEND_URL = "http://localhost:8000";    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
export interface ShopifyOrder {
    id: number;
    name: string; // ej: "#1024"
    created_at: string;
    financial_status: string;
    customer?: {
        first_name: string;
        last_name: string;
        email?: string;
        phone?: string;
    };
    shipping_address?: {
        address1: string;
        city: string;
        province: string;
        zip: string;
        phone?: string;
        country?: string;
    };
    correos_status?: string;
    correos_tracking?: string;
}

export interface OrdersResponse {
    success: boolean;
    orders: ShopifyOrder[];
}

export interface SingleOrderResponse {
    success: boolean;
    order: ShopifyOrder;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

// Helper para timeout en requests HTTP
function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {
        ...options,
        signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
}

export async function getPendingOrders(): Promise<ShopifyOrder[]> {
    try {
        const response = await fetchWithTimeout(`${BACKEND_URL}/ordenes`, {}, 30000);
        if (!response.ok) {
            throw new Error(`Error fetching orders: ${response.statusText}`);
        }
        const data: OrdersResponse = await response.json();
        return data.orders || [];
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("Timeout fetching orders");
            throw new Error("Timeout – intentá en 1 minuto");
        }
        console.error("Failed to fetch pending orders:", error);
        return [];
    }
}

export async function getOrderById(orderId: string): Promise<ShopifyOrder | null> {
    try {
        const response = await fetchWithTimeout(`${BACKEND_URL}/ordenes/${orderId}`, {}, 30000);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Error fetching order ${orderId}: ${response.statusText}`);
        }
        const data: SingleOrderResponse = await response.json();
        return data.order;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error(`Timeout fetching order ${orderId}`);
            throw new Error("Timeout – intentá en 1 minuto");
        }
        console.error(`Failed to fetch order ${orderId}:`, error);
        return null;
    }
}

// Consulta estado de orden directamente desde processed_orders.json (fuente de verdad)
export interface CorreosStatusResponse {
    exists: boolean;
    status: "GUIDE_CREATED" | "PROCESSING";
    tracking_number: string | null;
    processed_at: string | null;
}

export async function getCorreosStatus(orderId: string): Promise<CorreosStatusResponse | null> {
    // Normalizar: el backend espera TM-<id>
    const key = orderId.startsWith("TM-") ? orderId : `TM-${orderId}`;
    const url = `${BACKEND_URL}/correos/status/${encodeURIComponent(key)}`;

    console.log("[CORREOS][status] Requesting:", { orderId, normalizedKey: key, url });

    try {
        const response = await fetchWithTimeout(url, {}, 10000);

        console.log("[CORREOS][status] Response:", { status: response.status, ok: response.ok });

        if (!response.ok) {
            if (response.status === 404) {
                console.log("[CORREOS][status] Order not found in processed_orders");
                return null;
            }
            throw new Error(`Error fetching correos status: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[CORREOS][status] Data:", data);

        return data;
    } catch (error) {
        console.error("[CORREOS][status] Error:", error);
        return null;
    }
}
