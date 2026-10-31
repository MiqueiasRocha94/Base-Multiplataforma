"use client";

import { useState } from "react";
import { LucideCircleAlert } from "lucide-react";
import { faker } from "@faker-js/faker";

import { StatusScreen } from "@/components/status-screen";

const responses = [
    { code: 400, message: "Bad Request" },
    { code: 401, message: "Unauthorized" },
    { code: 402, message: "Payment Required" },
    { code: 403, message: "Forbidden" },
    { code: 405, message: "Method Not Allowed" },
    { code: 406, message: "Not Acceptable" },
    { code: 408, message: "Request Timeout" },
    { code: 409, message: "Conflict" },
    { code: 410, message: "Gone" },
    { code: 412, message: "Precondition Failed" },
    { code: 413, message: "Payload Too Large" },
    { code: 415, message: "Unsupported Media Type" },
    { code: 422, message: "Unprocessable Entity" },
    { code: 429, message: "Too Many Requests" },
];

export default function Demo400Page() {
    // Sorteada uma vez por montagem (fora do render, que precisa ser puro).
    const [response] = useState(() => responses[Math.floor(Math.random() * responses.length)]);

    return (
        <StatusScreen
            code={String(response.code)}
            tone="primary"
            icon={<LucideCircleAlert className="size-8" />}
            title={response.message}
            description={faker.lorem.words(15)}
            actions={[
                {
                    label: "Gerar outro erro",
                    onClick: () => window.location.reload(),
                },
            ]}
        />
    );
}