    # kaj-app Print Endpoints

    This document explains how the client app (kaj-app) can request prints through the end-to-end flow:

    kaj-dashboard → kaj-api → kaj-printer-bridge → Physical Printer

    The bridge exposes HTTP endpoints that accept fully rendered HTML to print. You may call these endpoints directly from kaj-app for local development/testing, or go through kaj-api in production.

    ## Base URL

    - Bridge: http://localhost:18080

    ## Endpoints

    - POST /api/print/html
    - POST /pos/html (alias)
    - POST /print/html (alias)
    - POST /api/pos/html (alias)

    All accept the same JSON body.

    ### Request Body

    - html (string, required): Complete or fragment HTML content to print. If a fragment is provided, the bridge wraps it into a print-ready HTML document.
    - title (string, optional): Title for the job shown in the Bridge UI.
    - station (string, optional): Logical station name to route the job (RECEIPT, KITCHEN, BAR). Mapped in bridge settings.
    - printerName (string, optional): Explicit printer device name. Overrides station mapping.
    - paperWidthMm (number, optional): Width in millimeters (e.g., 80 for thermal receipts). The bridge injects @page size accordingly.
    - preview (boolean, optional): UI hint only; bridge will still auto-print based on settings.
    - jobId (string, optional): Client-supplied ID for de-duplication.

    Example:

    {
    "html": "<div>سلام دنیا</div>",
    "title": "receipt-123",
    "station": "RECEIPT",
    "paperWidthMm": 80
    }

    ### Responses

    - 200 OK: { ok: true, jobId }
    - 4xx/5xx with { ok: false, error }

    ## Printer Selection Rules

    Priority when choosing target printer:
    1) printerName provided in request
    2) Station mapping configured in Bridge settings
    3) OS default printer (prefers non-virtual devices)

    Virtual printers (PDF/XPS/OneNote/Fax) are avoided for auto-routing. If a virtual device is mapped, Bridge falls back to a physical default when available.

    ## Silent vs Dialog Printing

    - Bridge prints silently by default. If settings.alwaysDialog is enabled, it shows a system dialog.
    - You can force silent mode via environment variable BRIDGE_FORCE_SILENT=1.
    - For maximum reliability, you can force the PDF spooler path: BRIDGE_FORCE_PDF=1.

    ## Testing

    - Quick test: GET /api/print/test?station=RECEIPT&width=80
    - List printers: GET /printers
    - Direct device test: GET /debug/print?device=YOUR_PRINTER&width=80&text=Hello

    ## Example: Calling from kaj-app

    Use fetch to post rendered HTML to the bridge in development:

    await fetch("http://localhost:18080/api/print/html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        html: renderReceiptHtml(order),
        title: `receipt-${order.id}`,
        station: "RECEIPT",
        paperWidthMm: 80
    })
    });

    In production, kaj-dashboard typically calls kaj-api, which forwards the HTML to the bridge. Keep the same payload shape.

    ## Troubleshooting

    - If logs say OK but no paper comes out, enable BRIDGE_FORCE_PDF=1 to use Windows spooler.
    - Ensure your Windows default printer is a physical device.
    - Check /printers output and use /debug/print to target a device directly.
