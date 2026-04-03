using Microsoft.EntityFrameworkCore;

namespace TaskManager.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<AppStateEntity> AppStates => Set<AppStateEntity>();

    public DbSet<UserEntity> Users => Set<UserEntity>();

    public DbSet<PasswordResetTokenEntity> PasswordResetTokens => Set<PasswordResetTokenEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppStateEntity>(entity =>
        {
            entity.ToTable("app_state");
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.UserId).HasMaxLength(64);
            entity.Property(e => e.Json).HasColumnType("jsonb");
            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.ToTable("users");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.PasswordHash).HasMaxLength(512);
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");
        });

        modelBuilder.Entity<PasswordResetTokenEntity>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.TokenHash).HasMaxLength(128);
            entity.Property(e => e.CreatedAt).HasColumnType("timestamp with time zone");
            entity.Property(e => e.ExpiresAt).HasColumnType("timestamp with time zone");
            entity.Property(e => e.UsedAt).HasColumnType("timestamp with time zone");
        });
    }
}
