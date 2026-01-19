import { Page, Text, Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <Page>
      <Text as="h1" variant="headingXl">Correos UI</Text>
      <div style={{ marginTop: "1rem" }}>
        <Button onClick={() => navigate("/orders")}>
          Ver órdenes
        </Button>
      </div>
    </Page>
  );
}
