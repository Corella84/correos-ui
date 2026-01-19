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

const BACKEND_URL = "http://localhost:8000";

export async function getPendingOrders(): Promise<ShopifyOrder[]> {
    try {
        const response = await fetch(`${BACKEND_URL}/ordenes`);
        if (!response.ok) {
            throw new Error(`Error fetching orders: ${response.statusText}`);
        }
        const data: OrdersResponse = await response.json();
        return data.orders || [];
    } catch (error) {
        console.error("Failed to fetch pending orders:", error);
        return [];
    }
}

export async function getOrderById(orderId: string): Promise<ShopifyOrder | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/ordenes/${orderId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Error fetching order ${orderId}: ${response.statusText}`);
        }
        const data: SingleOrderResponse = await response.json();
        return data.order;
    } catch (error) {
        console.error(`Failed to fetch order ${orderId}:`, error);
        return null;
    }
}
