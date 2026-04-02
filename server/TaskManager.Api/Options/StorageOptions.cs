namespace TaskManager.Api.Options;

public class StorageOptions
{
    public const string SectionName = "Storage";

    public string Provider { get; set; } = "Json";

    public string JsonPath { get; set; } = "data/state.json";
}
