using Microsoft.EntityFrameworkCore;

namespace TaskManager.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<AppStateEntity> AppStates => Set<AppStateEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppStateEntity>(entity =>
        {
            entity.ToTable("app_state");
            entity.Property(e => e.Json).HasColumnType("jsonb");
            entity.Property(e => e.UpdatedAt).HasColumnType("timestamp with time zone");
        });
    }
}
