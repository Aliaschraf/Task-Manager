namespace TaskManager.Api.Services;

public interface IPasswordResetSender
{
    Task SendAsync(string email, string resetLink, CancellationToken cancellationToken = default);
}
