import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key_for_build');

export async function sendNewHackathonAlert(toEmail, hackathons) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not defined. Skipping email dispatch.');
    return;
  }

  const itemsListHtml = hackathons.map(h => `
    <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc;">
      <h3 style="margin-top: 0; color: #1e1b4b; font-size: 18px;">${h.name}</h3>
      <p style="color: #475569; font-size: 14px; margin-bottom: 12px;">Organized by <strong>${h.organizer}</strong></p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">${h.description}</p>
      <div style="margin-top: 16px;">
        <span style="background-color: #ede9fe; color: #5b21b6; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px;">
          Prize: ₹${(h.prizePool || 0).toLocaleString('en-IN')}
        </span>
        <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
          Deadline: ${new Date(h.registrationDeadline).toLocaleDateString('en-IN')}
        </span>
      </div>
      <div style="margin-top: 16px;">
        <a href="${h.registrationLink}" style="background-color: #6d28d9; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; display: inline-block;">
          Register Now
        </a>
      </div>
    </div>
  `).join('');

  try {
    await resend.emails.send({
      from: 'HackRadar <onboarding@resend.dev>',
      to: toEmail,
      subject: `🔥 New Hackathon Opportunities Found!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <h1 style="color: #4c1d95; font-size: 24px; text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 16px;">HackRadar Alerts</h1>
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We found new hackathons matching your preferences! Take a look below:</p>
          
          ${itemsListHtml}
          
          <p style="font-size: 14px; color: #64748b; text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px;">
            Built with ♥ by Nihal Pradhan for Indian builders.<br/>
            You can change your alert preferences anytime from the HackRadar Dashboard.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}

export async function sendWeeklyDigest(toEmail, hackathons, stats) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not defined. Skipping email dispatch.');
    return;
  }

  const itemsListHtml = hackathons.map(h => `
    <div style="margin-bottom: 16px; padding: 12px; border-bottom: 1px solid #f1f5f9;">
      <h4 style="margin: 0 0 4px 0; color: #1e1b4b; font-size: 16px;">${h.name} (${h.organizer})</h4>
      <p style="margin: 0; color: #64748b; font-size: 12px;">Prize: ₹${(h.prizePool || 0).toLocaleString('en-IN')} | Deadline: ${new Date(h.registrationDeadline).toLocaleDateString('en-IN')}</p>
    </div>
  `).join('');

  try {
    await resend.emails.send({
      from: 'HackRadar <onboarding@resend.dev>',
      to: toEmail,
      subject: `📊 Your HackRadar Weekly Opportunities Digest`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #0f172a;">
          <h1 style="color: #4c1d95; font-size: 24px; text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 16px;">HackRadar Weekly Digest</h1>
          <p style="font-size: 16px; line-height: 1.6;">Hi developer,</p>
          
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Weekly Platform Stats</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.6;">
              <li><strong>Active Hackathons:</strong> ${stats.activeCount || 0}</li>
              <li><strong>Combined Prize Pool:</strong> ₹${(stats.totalPrize || 0).toLocaleString('en-IN')}</li>
              <li><strong>Closing this week:</strong> ${stats.closingThisWeekCount || 0}</li>
            </ul>
          </div>

          <h3 style="color: #1e1b4b; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Top Open Opportunities</h3>
          ${itemsListHtml || '<p style="color: #64748b; font-style: italic;">No new hackathons matching your filters this week.</p>'}
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://hackathon-app-pi.vercel.app/" style="background-color: #6d28d9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold; display: inline-block;">
              Browse All Opportunities
            </a>
          </div>

          <p style="font-size: 14px; color: #64748b; text-align: center; border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px;">
            Built with ♥ by Nihal Pradhan for Indian builders.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send weekly digest:', error);
  }
}
