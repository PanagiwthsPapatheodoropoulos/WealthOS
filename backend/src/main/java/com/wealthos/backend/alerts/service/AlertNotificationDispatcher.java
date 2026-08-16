package com.wealthos.backend.alerts.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthos.backend.alerts.entity.Alert;
import com.wealthos.backend.alerts.entity.AlertCondition;
import com.wealthos.backend.notifications.entity.NotificationType;
import com.wealthos.backend.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertNotificationDispatcher {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public void dispatchAlertNotification(Alert alert, BigDecimal currentPrice) {
        String symbol = alert.getAsset() != null ? alert.getAsset().getSymbol() : "ASSET";
        String assetName = alert.getAsset() != null && alert.getAsset().getName() != null
                ? alert.getAsset().getName() : symbol;
        String currency = alert.getAsset() != null ? alert.getAsset().getCurrency() : "EUR";
        String currSym = resolveCurrencySymbol(symbol, currency);
        String condLabel = alert.getCondition() == AlertCondition.ABOVE ? "Crossed Above (≥)" : "Dropped Below (≤)";

        // 1. In-App Notification (Notification Bell)
        try {
            String notifTitle = String.format("Price Alert: %s %s %s%.2f",
                    symbol, condLabel, currSym, alert.getTargetPrice());
            String notifMsg = String.format("%s reached %s%.2f (Target: %s%.2f).",
                    symbol, currSym, currentPrice, currSym, alert.getTargetPrice());

            notificationService.createNotification(
                    alert.getUser().getId(),
                    notifTitle,
                    notifMsg,
                    NotificationType.ALERT_TRIGGERED
            );
            log.info("In-app notification created for user {}", alert.getUser().getId());
        } catch (Exception e) {
            log.warn("Failed to create in-app notification: {}", e.getMessage());
        }

        // 2. Real-Time Email Dispatch (Async)
        CompletableFuture.runAsync(() -> {
            try {
                sendEmailNotification(alert, symbol, assetName, currSym, condLabel, currentPrice);
            } catch (Exception e) {
                log.error("Failed to execute async email dispatch for alert {}: {}", alert.getId(), e.getMessage(), e);
            }
        });
    }

    private void sendEmailNotification(Alert alert, String symbol, String assetName,
                                       String currSym, String condLabel, BigDecimal currentPrice) {
        String targetEmail = System.getenv("TARGET_ALERT_EMAIL");
        if (targetEmail == null || targetEmail.isBlank()) {
            if (alert.getUser() != null && alert.getUser().getEmail() != null) {
                targetEmail = alert.getUser().getEmail().trim();
            }
        }

        if (targetEmail == null || targetEmail.isBlank() || !targetEmail.contains("@")) {
            log.warn("Cannot dispatch alert email: No valid recipient email found for user {}",
                    alert.getUser() != null ? alert.getUser().getId() : "unknown");
            return;
        }

        String timeStr = ZonedDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm 'UTC'"));
        String subject = String.format("[WealthOS Alert] %s reached %s%.2f (Target: %s%.2f)",
                symbol, currSym, currentPrice, currSym, alert.getTargetPrice());
        String htmlBody = buildHtmlEmail(symbol, assetName, condLabel, currSym, alert.getTargetPrice(), currentPrice, targetEmail, timeStr);

        // Priority 1: Brevo REST API
        String brevoApiKey = System.getenv("BREVO_API_KEY");
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            boolean ok = dispatchViaBrevo(brevoApiKey.trim(), targetEmail, subject, htmlBody);
            if (ok) return;
        }

        // Priority 2: Google Cloud Sentinel Webhook
        String googleUrl = System.getenv("GOOGLE_SENTINEL_WEBHOOK_URL");
        if (googleUrl != null && !googleUrl.isBlank()) {
            boolean ok = dispatchViaGoogleSentinel(googleUrl.trim(), targetEmail, subject, htmlBody);
            if (ok) return;
        }

        // Priority 3: FastAPI Internal Bridge
        String fastapiBase = System.getenv("FASTAPI_INTERNAL_URL");
        if (fastapiBase == null || fastapiBase.isBlank()) {
            fastapiBase = "http://ai-service:8000";
        }
        dispatchViaFastApiBridge(fastapiBase, targetEmail, symbol, assetName, alert.getCondition().name(),
                alert.getTargetPrice(), currentPrice, currSym);
    }

    private boolean dispatchViaBrevo(String apiKey, String toEmail, String subject, String htmlContent) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("sender", Map.of("name", "WealthOS Institutional Alerts", "email", toEmail));
            payload.put("to", List.of(Map.of("email", toEmail)));
            payload.put("subject", subject);
            payload.put("htmlContent", htmlContent);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                    .timeout(Duration.ofSeconds(10))
                    .header("accept", "application/json")
                    .header("api-key", apiKey)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 || response.statusCode() == 201) {
                log.info("✅ Alert email successfully dispatched via Brevo REST API to {}", toEmail);
                return true;
            } else {
                log.warn("Brevo API responded with status {}: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("Exception while sending via Brevo API: {}", e.getMessage());
            return false;
        }
    }

    private boolean dispatchViaGoogleSentinel(String webhookUrl, String toEmail, String subject, String htmlBody) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("action", "DISPATCH_EMAIL");
            payload.put("recipientEmail", toEmail);
            payload.put("subject", subject);
            payload.put("htmlBody", htmlBody);

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(webhookUrl))
                    .timeout(Duration.ofSeconds(12))
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                log.info("✅ Alert email successfully dispatched via Google Cloud Sentinel Webhook to {}", toEmail);
                return true;
            } else {
                log.warn("Google Sentinel Webhook responded with status {}: {}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.error("Exception while sending via Google Sentinel Webhook: {}", e.getMessage());
            return false;
        }
    }

    private void dispatchViaFastApiBridge(String baseUrl, String toEmail, String symbol, String assetName,
                                          String condition, BigDecimal targetPrice, BigDecimal currentPrice,
                                          String currSym) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("recipientEmail", toEmail);
            payload.put("symbol", symbol);
            payload.put("assetName", assetName);
            payload.put("condition", condition);
            payload.put("targetPrice", targetPrice.doubleValue());
            payload.put("livePrice", currentPrice.doubleValue());
            payload.put("currency", currSym.equals("€") ? "EUR" : (currSym.equals("£") ? "GBP" : "USD"));

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl.replaceAll("/$", "") + "/api/assets/alerts/send-test-email"))
                    .timeout(Duration.ofSeconds(10))
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("FastAPI dispatch bridge response (HTTP {}): {}", response.statusCode(), response.body());
        } catch (Exception e) {
            log.warn("FastAPI dispatch bridge was not reachable: {}", e.getMessage());
        }
    }

    private String resolveCurrencySymbol(String symbol, String currency) {
        if (currency != null && !currency.isBlank()) {
            String c = currency.trim().toUpperCase();
            if (c.equals("EUR")) return "€";
            if (c.equals("GBP")) return "£";
            if (c.equals("USD")) return "$";
            if (c.equals("CHF")) return "CHF ";
            if (c.equals("JPY")) return "¥";
            if (c.equals("CAD")) return "CA$";
            if (c.equals("AUD")) return "AU$";
            return c + " ";
        }
        String s = symbol != null ? symbol.trim().toUpperCase() : "";
        if (s.endsWith(".MI") || s.endsWith(".DE") || s.endsWith(".F") || s.endsWith(".MU") ||
            s.endsWith(".PA") || s.endsWith(".AS") || s.endsWith(".BR") || s.endsWith(".MC") || s.endsWith(".AT")) {
            return "€";
        }
        if (s.endsWith(".L") || s.endsWith(".IL")) {
            return "£";
        }
        if (s.endsWith(".SW") || s.endsWith(".VX")) {
            return "CHF ";
        }
        if (s.endsWith(".T")) {
            return "¥";
        }
        if (s.endsWith(".TO") || s.endsWith(".V")) {
            return "CA$";
        }
        if (s.endsWith(".AX")) {
            return "AU$";
        }
        if (s.endsWith("-EUR")) return "€";
        if (s.endsWith("-GBP")) return "£";
        return "$";
    }

    private String buildHtmlEmail(String symbol, String assetName, String condLabel,
                                  String currSym, BigDecimal targetPrice, BigDecimal currentPrice,
                                  String recipientEmail, String timeStr) {
        boolean isAbove = condLabel.contains("Above");
        String badgeBg = isAbove ? "#ecfdf5" : "#fef2f2";
        String badgeColor = isAbove ? "#047857" : "#b91c1c";
        String badgeBorder = isAbove ? "#a7f3d0" : "#fecaca";

        return String.format("""
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <div style="background: #09090b; padding: 24px; color: #ffffff;">
                    <div style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #10b981; text-transform: uppercase;">WealthOS Real-Time Execution Engine</div>
                    <h1 style="font-size: 20px; font-weight: 800; margin: 6px 0 2px 0; color: #ffffff;">Price Alert Triggered</h1>
                    <div style="font-size: 12px; color: #94a3b8;">Monitored for <strong>%s</strong> &bull; %s</div>
                </div>
                <div style="padding: 24px;">
                    <div style="background: %s; border: 1px solid %s; border-left: 5px solid %s; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: baseline;">
                            <div>
                                <span style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">%s</span>
                                <span style="font-size: 12px; color: #64748b; margin-left: 6px;">%s</span>
                            </div>
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: #ffffff; color: %s; border: 1px solid %s;">
                                %s
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed %s;">
                            <div>
                                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Target Threshold</div>
                                <div style="font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace;">%s%.2f</div>
                            </div>
                            <div>
                                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Trigger Execution Price</div>
                                <div style="font-size: 16px; font-weight: 800; color: %s; font-family: monospace;">%s%.2f</div>
                            </div>
                        </div>
                    </div>
                    <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 16px 0;">
                        Your sub-second price surveillance order for <strong>%s</strong> matched institutional market feeds.
                    </p>
                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
                        WealthOS Sub-Second Monitoring &bull; Greek Law 4172/2013 0%% CGT Framework
                    </div>
                </div>
            </div>
            """,
                recipientEmail, timeStr,
                badgeBg, badgeBorder, badgeColor,
                symbol, assetName,
                badgeColor, badgeBorder, condLabel,
                badgeBorder,
                currSym, targetPrice,
                badgeColor, currSym, currentPrice,
                symbol
        );
    }
}
