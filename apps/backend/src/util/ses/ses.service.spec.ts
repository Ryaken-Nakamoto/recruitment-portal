import { SesService } from './ses.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock('marked', () => ({
  marked: {
    use: jest.fn(),
    parse: jest.fn((markdown) => {
      // Simple mock: wrap in <p> tags and convert **text** to <strong>
      const html = markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    }),
  },
}));

describe('SesService', () => {
  let service: SesService;

  beforeEach(() => {
    mockSend.mockReset();
    delete process.env.NODE_ENV;
    service = new SesService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls SESv2Client.send with correct payload including HTML body', async () => {
    mockSend.mockResolvedValue({});

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toMatchObject({
      FromEmailAddress: 'team@c4c.com',
      Destination: { ToAddresses: ['alice@example.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Hello Alice' },
          Body: {
            Text: { Data: 'Welcome!' },
            Html: { Data: '<p>Welcome!</p>' },
          },
        },
      },
    });
  });

  it('renders markdown bold as HTML strong tags', async () => {
    mockSend.mockResolvedValue({});

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Test Bold',
      body: 'This is **bold** text',
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Content.Simple.Body.Html.Data).toContain(
      '<strong>bold</strong>',
    );
  });

  it('throws when SESv2Client.send rejects', async () => {
    mockSend.mockRejectedValue(new Error('SES failure'));

    await expect(
      service.sendEmail({
        to: 'alice@example.com',
        from: 'team@c4c.com',
        subject: 'Hello',
        body: 'Body',
      }),
    ).rejects.toThrow('SES failure');
  });

  it('skips sending when NODE_ENV is local', async () => {
    process.env.NODE_ENV = 'local';

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSend).not.toHaveBeenCalled();
  });
});
