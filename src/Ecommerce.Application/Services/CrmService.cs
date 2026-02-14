using Ecommerce.Application.Repositories;
using Ecommerce.Domain.Entities;

namespace Ecommerce.Application.Services;

public class CrmService
{
    private readonly ICrmLeadRepository _leadRepository;
    private readonly ICrmDealRepository _dealRepository;
    private readonly ICrmContactRepository _contactRepository;
    private readonly ICrmActivityRepository _activityRepository;

    public CrmService(
        ICrmLeadRepository leadRepository,
        ICrmDealRepository dealRepository,
        ICrmContactRepository contactRepository,
        ICrmActivityRepository activityRepository)
    {
        _leadRepository = leadRepository;
        _dealRepository = dealRepository;
        _contactRepository = contactRepository;
        _activityRepository = activityRepository;
    }

    public Task<IEnumerable<CrmLead>> GetLeadsAsync() => _leadRepository.GetAllAsync();

    public async Task<CrmLead> GetLeadAsync(Guid id)
        => await _leadRepository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Lead not found");

    public async Task<CrmLead> CreateLeadAsync(CrmLead lead)
    {
        lead.Id = Guid.NewGuid();
        lead.CreatedAt = DateTime.UtcNow;
        await _leadRepository.AddAsync(lead);
        return lead;
    }

    public async Task<CrmLead> UpdateLeadAsync(CrmLead lead)
    {
        lead.UpdatedAt = DateTime.UtcNow;
        await _leadRepository.UpdateAsync(lead);
        return lead;
    }

    public Task DeleteLeadAsync(Guid id) => _leadRepository.DeleteAsync(id);

    public Task<IEnumerable<CrmDeal>> GetDealsAsync() => _dealRepository.GetAllAsync();

    public async Task<CrmDeal> GetDealAsync(Guid id)
        => await _dealRepository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Deal not found");

    public async Task<CrmDeal> CreateDealAsync(CrmDeal deal)
    {
        deal.Id = Guid.NewGuid();
        deal.CreatedAt = DateTime.UtcNow;
        await _dealRepository.AddAsync(deal);
        return deal;
    }

    public async Task<CrmDeal> UpdateDealAsync(CrmDeal deal)
    {
        deal.UpdatedAt = DateTime.UtcNow;
        await _dealRepository.UpdateAsync(deal);
        return deal;
    }

    public Task DeleteDealAsync(Guid id) => _dealRepository.DeleteAsync(id);

    public Task<IEnumerable<CrmContact>> GetContactsAsync() => _contactRepository.GetAllAsync();

    public async Task<CrmContact> GetContactAsync(Guid id)
        => await _contactRepository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Contact not found");

    public async Task<CrmContact> CreateContactAsync(CrmContact contact)
    {
        contact.Id = Guid.NewGuid();
        contact.CreatedAt = DateTime.UtcNow;
        await _contactRepository.AddAsync(contact);
        return contact;
    }

    public async Task<CrmContact> UpdateContactAsync(CrmContact contact)
    {
        contact.UpdatedAt = DateTime.UtcNow;
        await _contactRepository.UpdateAsync(contact);
        return contact;
    }

    public Task DeleteContactAsync(Guid id) => _contactRepository.DeleteAsync(id);

    public Task<IEnumerable<CrmActivity>> GetActivitiesAsync() => _activityRepository.GetAllAsync();

    public async Task<CrmActivity> GetActivityAsync(Guid id)
        => await _activityRepository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Activity not found");

    public async Task<CrmActivity> CreateActivityAsync(CrmActivity activity)
    {
        activity.Id = Guid.NewGuid();
        activity.CreatedAt = DateTime.UtcNow;
        await _activityRepository.AddAsync(activity);
        return activity;
    }

    public async Task<CrmActivity> UpdateActivityAsync(CrmActivity activity)
    {
        activity.UpdatedAt = DateTime.UtcNow;
        await _activityRepository.UpdateAsync(activity);
        return activity;
    }

    public Task DeleteActivityAsync(Guid id) => _activityRepository.DeleteAsync(id);
}
