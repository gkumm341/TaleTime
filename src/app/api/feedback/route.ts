import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface FeedbackData {
  type: 'bug' | 'feature' | 'general';
  message: string;
  email?: string | null;
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
    screenResolution: string;
    viewport: string;
    timestamp: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const data: FeedbackData = await req.json();

    // Validate required fields
    if (!data.type || !data.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Log feedback to console (in production, send to email/database/analytics)
    console.log('📝 FEEDBACK RECEIVED:', {
      type: data.type,
      message: data.message,
      email: data.email || 'Not provided',
      browserInfo: data.browserInfo,
      receivedAt: new Date().toISOString(),
    });

    // In a real application, you would:
    // 1. Send email via SendGrid, AWS SES, or similar
    // 2. Store in database for tracking
    // 3. Create issue in GitHub/Jira
    // 4. Send to analytics platform
    
    // Example: Send email (commented out - requires email service setup)
    // await sendEmail({
    //   to: 'feedback@taletime.app',
    //   subject: `TaleTime Feedback: ${data.type}`,
    //   body: `
    //     Type: ${data.type}
    //     Message: ${data.message}
    //     Email: ${data.email || 'Not provided'}
    //     Browser: ${data.browserInfo.userAgent}
    //     Platform: ${data.browserInfo.platform}
    //     Screen: ${data.browserInfo.screenResolution}
    //     Timestamp: ${data.browserInfo.timestamp}
    //   `,
    // });

    return NextResponse.json(
      { 
        success: true,
        message: 'Feedback received. Thank you!' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}
