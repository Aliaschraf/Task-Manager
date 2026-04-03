using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using TaskManager.Api.Options;

namespace TaskManager.Api.Services;

public class SmtpPasswordResetSender : IPasswordResetSender
{
    private readonly PasswordResetEmailOptions _options;

    public SmtpPasswordResetSender(IOptions<PasswordResetEmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(string email, string resetLink, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Host) ||
            string.IsNullOrWhiteSpace(_options.FromAddress))
        {
            throw new InvalidOperationException("Password reset email configuration is missing.");
        }

        using var message = new MailMessage(_options.FromAddress, email)
        {
            Subject = "Reset your Task Manager password",
            Body = $"Use this link to reset your password: {resetLink}",
        };

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.UseSsl,
        };

        if (!string.IsNullOrWhiteSpace(_options.Username))
        {
            client.Credentials = new NetworkCredential(_options.Username, _options.Password);
        }

        await client.SendMailAsync(message, cancellationToken);
    }
}
