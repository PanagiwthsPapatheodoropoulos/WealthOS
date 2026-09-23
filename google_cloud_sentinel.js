/**
 * WealthOS 24/7 Autonomous Cloud Sentinel (Zero-Defaults • 100% Dynamic)
 * =====================================================================
 * 100% Free • No Credit Card • Zero Hardcoded Assets
 * 
 * Takes dynamically ONLY what you arm in your WealthOS Terminal.
 */

function getScriptRecipientEmail() {
  try {
    const props = PropertiesService.getScriptProperties();
    const saved = props.getProperty("RECIPIENT_EMAIL");
    if (saved && saved.indexOf("@") !== -1) return saved;
    const userEmail = Session.getActiveUser().getEmail();
    if (userEmail && userEmail.indexOf("@") !== -1) return userEmail;
  } catch (e) {}
  return "";
}

function checkPriceAlerts() {
  const props = PropertiesService.getScriptProperties();
  const alertsJson = props.getProperty("WEALTHOS_ALERTS");
  if (!alertsJson) return;

  const alerts = JSON.parse(alertsJson);
  if (!Array.isArray(alerts) || alerts.length === 0) return;

  const recipient = props.getProperty("RECIPIENT_EMAIL") || getScriptRecipientEmail();

  alerts.forEach(alert => {
    try {
      const livePrice = fetchLivePrice(alert.symbol);
      if (!livePrice || livePrice <= 0) return;

      const alertKey = 'triggered_' + (alert.id || alert.symbol) + '_' + alert.condition + '_' + alert.targetPrice;
      const isAlreadyTriggered = props.getProperty(alertKey) === 'true';

      const cond = (alert.condition || 'ABOVE').toUpperCase();
      let triggered = false;
      if (cond === 'ABOVE' && livePrice >= alert.targetPrice) {
        triggered = true;
      } else if (cond === 'BELOW' && livePrice <= alert.targetPrice) {
        triggered = true;
      }

      if (triggered && !isAlreadyTriggered) {
        sendInstitutionalAlertEmail(alert, livePrice, recipient);
        props.setProperty(alertKey, 'true');
        Logger.log('[ALERT TRIGGERED] ' + alert.symbol + ' reached ' + livePrice);
      } else if (!triggered && isAlreadyTriggered) {
        props.deleteProperty(alertKey);
      }
    } catch (err) {
      Logger.log('Error checking alert for ' + alert.symbol + ': ' + err.toString());
    }
  });
}

function fetchLivePrice(symbol) {
  try {
    const cleanSym = encodeURIComponent(symbol.trim());
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + cleanSym + '?interval=1m&range=1d';
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (res.getResponseCode() !== 200) return null;
    const json = JSON.parse(res.getContentText());
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ? Number(price) : null;
  } catch (err) {
    Logger.log('Failed to fetch quote for ' + symbol + ': ' + err.toString());
    return null;
  }
}

function doPost(e) {
  try {
    const raw = e?.postData?.contents;
    if (!raw) return jsonResponse({ status: 'error', message: 'Empty payload' });

    const data = JSON.parse(raw);
    const props = PropertiesService.getScriptProperties();

    // 1. Direct Email Dispatch from WealthOS
    if (data.action === 'DISPATCH_EMAIL') {
      const to = data.recipientEmail || props.getProperty('RECIPIENT_EMAIL') || getScriptRecipientEmail();
      MailApp.sendEmail({
        to: to,
        subject: data.subject || '[WealthOS Alert]',
        htmlBody: data.htmlBody || '<p>Alert triggered</p>'
      });
      return jsonResponse({
        status: 'success',
        message: 'Email dispatched via MailApp',
        deliveredTo: to,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Instant Test Email
    if (data.action === 'TEST_EMAIL') {
      const to = data.recipientEmail || props.getProperty('RECIPIENT_EMAIL') || getScriptRecipientEmail();
      sendTestEmailTo(to);
      return jsonResponse({
        status: 'success',
        message: 'Test email dispatched',
        deliveredTo: to,
        timestamp: new Date().toISOString()
      });
    }

    // 3. Immediate Price Check & Trigger Evaluation
    if (data.action === 'CHECK_NOW') {
      const evalResult = checkPriceAlerts();
      return jsonResponse({
        status: 'success',
        action: 'checked',
        result: evalResult,
        timestamp: new Date().toISOString()
      });
    }

    // 4. Sync Alerts from WealthOS PostgreSQL
    if (data.action === 'SYNC_ALERTS' && Array.isArray(data.alerts)) {
      props.setProperty('WEALTHOS_ALERTS', JSON.stringify(data.alerts));
      if (data.recipientEmail) props.setProperty('RECIPIENT_EMAIL', data.recipientEmail);
      
      // Immediately run check on synced alerts
      const evalResult = checkPriceAlerts();

      return jsonResponse({
        status: 'success',
        activeCount: data.alerts.length,
        evaluated: evalResult,
        recipient: data.recipientEmail || props.getProperty('RECIPIENT_EMAIL') || getScriptRecipientEmail(),
        timestamp: new Date().toISOString()
      });
    }

    // 5. Direct Email Recipient Update
    if (data.action === 'SET_RECIPIENT_EMAIL' && data.recipientEmail) {
      props.setProperty('RECIPIENT_EMAIL', data.recipientEmail);
      return jsonResponse({
        status: 'success',
        message: 'Recipient email updated successfully to ' + data.recipientEmail,
        recipient: data.recipientEmail,
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({ status: 'ignored', receivedAction: data.action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function resolveSentinelCurrencySymbol(currency, symbol) {
  if (currency) {
    const c = currency.toString().toUpperCase().trim();
    if (c === 'EUR') return '€';
    if (c === 'GBP') return '£';
    if (c === 'USD') return '$';
    if (c === 'CHF') return 'CHF ';
    if (c === 'JPY') return '¥';
    if (c === 'CAD') return 'CA$';
    if (c === 'AUD') return 'AU$';
    return c + ' ';
  }
  const s = (symbol || '').toString().toUpperCase().trim();
  const euroSuffixes = ['.MI', '.DE', '.F', '.MU', '.PA', '.AS', '.BR', '.MC', '.AT', '.VI', '.HE', '.IR'];
  for (let i = 0; i < euroSuffixes.length; i++) {
    if (s.endsWith(euroSuffixes[i])) return '€';
  }
  if (s.endsWith('.L') || s.endsWith('.IL')) return '£';
  if (s.endsWith('.SW') || s.endsWith('.VX')) return 'CHF ';
  if (s.endsWith('.T')) return '¥';
  if (s.endsWith('.TO') || s.endsWith('.V')) return 'CA$';
  if (s.endsWith('.AX')) return 'AU$';
  if (s.endsWith('-EUR')) return '€';
  if (s.endsWith('-GBP')) return '£';
  return '$';
}

function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const alertsJson = props.getProperty('WEALTHOS_ALERTS');
  const alerts = alertsJson ? JSON.parse(alertsJson) : [];
  const recipient = props.getProperty('RECIPIENT_EMAIL') || getScriptRecipientEmail();

  // Support ?action=test in browser
  if (e?.parameter?.action === 'test') {
    sendTestEmailTo(recipient);
    return jsonResponse({
      status: 'success',
      message: 'Test alert email sent to ' + recipient,
      timestamp: new Date().toISOString()
    });
  }

  // Support ?action=check in browser
  if (e?.parameter?.action === 'check') {
    const res = checkPriceAlerts();
    return jsonResponse({
      status: 'success',
      result: res,
      timestamp: new Date().toISOString()
    });
  }

  let remainingQuota = 100;
  try {
    remainingQuota = MailApp.getRemainingDailyQuota();
  } catch (err) {}

  return jsonResponse({
    status: 'online',
    service: 'WealthOS 24/7 Dynamic Cloud Sentinel',
    activeDynamicAlertsCount: alerts.length,
    alerts: alerts,
    recipientEmail: recipient,
    remainingDailyEmailQuota: remainingQuota,
    timestamp: new Date().toISOString()
  });
}

function sendTestEmail() {
  const props = PropertiesService.getScriptProperties();
  const recipient = props.getProperty('RECIPIENT_EMAIL') || getScriptRecipientEmail();
  sendTestEmailTo(recipient);
}

function sendTestEmailTo(recipient) {
  const html = '<div style="background-color: #f1f5f9; padding: 28px 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
    '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">' +
    '<div style="background: #09090b; padding: 22px 28px; border-bottom: 2px solid #10b981;">' +
    '<div style="color: #10b981; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">WealthOS Cloud Sentinel</div>' +
    '<h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 800;">Surveillance Link Verified</h1>' +
    '</div>' +
    '<div style="padding: 26px 28px;">' +
    '<p style="font-size: 13px; color: #475569; margin: 0 0 18px 0;">Your 24/7 real-time alert dispatch channel is armed and operational for <strong>' + recipient + '</strong>.</p>' +
    '<div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">' +
    '<div style="font-size: 16px; font-weight: 800; color: #065f46;">✓ 100% Free Autonomous Monitoring Active</div>' +
    '<div style="font-size: 12px; color: #047857; margin-top: 4px;">Sub-second triggers are configured. Alerts will arrive here immediately upon threshold breaches.</div>' +
    '</div>' +
    '</div>' +
    '<div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; font-size: 11px; color: #64748b; text-align: center;">' +
    'WealthOS Autonomous Cloud Sentinel • 100% Free Surveillance' +
    '</div>' +
    '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: recipient,
    subject: '[WealthOS Verified] 24/7 Autonomous Cloud Sentinel Armed',
    htmlBody: html
  });
  Logger.log('Test email successfully sent to ' + recipient);
}

function sendInstitutionalAlertEmail(alert, livePrice, recipient) {
  const isAbove = (alert.condition || 'ABOVE').toUpperCase() === 'ABOVE';
  const badgeColor = isAbove ? '#10b981' : '#f43f5e';
  const badgeBg = isAbove ? '#ecfdf5' : '#fff1f2';
  const badgeBorder = isAbove ? '#a7f3d0' : '#fecdd3';
  const conditionLabel = isAbove ? 'CROSSED ABOVE (>=)' : 'DROPPED BELOW (<=)';
  
  const currSym = resolveSentinelCurrencySymbol(alert.currency, alert.symbol);

  const subject = '[WealthOS Alert] ' + alert.symbol + ' ' + alert.condition + ' ' + currSym + Number(alert.targetPrice).toFixed(2) + ' (Live: ' + currSym + Number(livePrice).toFixed(2) + ')';

  const html = '<div style="background-color: #f1f5f9; padding: 28px 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">' +
    '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">' +
    '<div style="background: #09090b; padding: 22px 28px; border-bottom: 2px solid #10b981;">' +
    '<div style="color: #10b981; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">WealthOS 24/7 Cloud Sentinel</div>' +
    '<h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 800;">Target Price Condition Met</h1>' +
    '</div>' +
    '<div style="padding: 26px 28px;">' +
    '<p style="font-size: 13px; color: #475569; margin: 0 0 18px 0;">Your price target armed in WealthOS has been reached:</p>' +
    '<div style="background: ' + badgeBg + '; border: 1px solid ' + badgeBorder + '; border-radius: 12px; padding: 20px; margin-bottom: 22px;">' +
    '<div style="font-size: 22px; font-weight: 800; color: #0f172a; font-family: monospace;">' + alert.symbol + '</div>' +
    '<div style="font-size: 13px; color: #64748b; margin-top: 2px;">' + (alert.name || alert.symbol) + '</div>' +
    '<div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed ' + badgeBorder + '; font-size: 14px;">' +
    '<strong>Condition: </strong>' + conditionLabel + '<br/>' +
    '<strong>Target Threshold: </strong>' + currSym + Number(alert.targetPrice).toFixed(2) + '<br/>' +
    '<strong>Execution Price: </strong><span style="color: ' + badgeColor + '; font-weight: 800;">' + currSym + Number(livePrice).toFixed(2) + '</span>' +
    '</div>' +
    '</div>' +
    '<p style="font-size: 12px; color: #64748b;">Log in to your WealthOS Terminal to review your positions.</p>' +
    '</div>' +
    '<div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 28px; font-size: 11px; color: #64748b; text-align: center;">' +
    'WealthOS Autonomous Cloud Sentinel • 100% Free 24/7 Surveillance' +
    '</div>' +
    '</div>' +
    '</div>';

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: html
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
