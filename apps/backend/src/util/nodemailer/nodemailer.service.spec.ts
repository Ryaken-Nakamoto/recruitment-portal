import { NodemailerService } from './nodemailer.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest
    .fn()
    .mockImplementation(() => ({ sendMail: mockSendMail })),
}));

jest.mock('marked', () => ({
  marked: {
    use: jest.fn(),
    parse: jest.fn((markdown: string) => {
      const html = markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      return `<p>${html}</p>`;
    }),
  },
}));

describe('NodemailerService', () => {
  let service: NodemailerService;

  beforeEach(() => {
    mockSendMail.mockReset();
    delete process.env.NODE_ENV;
    delete process.env.MOCK_EMAIL;
    delete process.env.MOCK_EMAIL_DEST;
    service = new NodemailerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls sendMail with correct payload including HTML body', async () => {
    mockSendMail.mockResolvedValue({});

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'team@c4c.com',
      to: 'alice@example.com',
      subject: 'Hello Alice',
      text: 'Welcome!',
      html: '<p>Welcome!</p>',
    });
  });

  it('renders markdown bold as HTML strong tags', async () => {
    mockSendMail.mockResolvedValue({});

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Test Bold',
      body: 'This is **bold** text',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain('<strong>bold</strong>');
  });

  it('throws when sendMail rejects', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP failure'));

    await expect(
      service.sendEmail({
        to: 'alice@example.com',
        from: 'team@c4c.com',
        subject: 'Hello',
        body: 'Body',
      }),
    ).rejects.toThrow('SMTP failure');
  });

  it('skips sending when NODE_ENV is local', async () => {
    process.env.NODE_ENV = 'local';

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('redirects to MOCK_EMAIL_DEST when MOCK_EMAIL is true', async () => {
    mockSendMail.mockResolvedValue({});
    process.env.MOCK_EMAIL = 'true';
    process.env.MOCK_EMAIL_DEST = 'test@dev.local';

    await service.sendEmail({
      to: 'alice@example.com',
      from: 'team@c4c.com',
      subject: 'Hello Alice',
      body: 'Welcome!',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('test@dev.local');
  });
});
