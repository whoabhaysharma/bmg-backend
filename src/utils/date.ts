import { PlanType } from '@prisma/client';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export const calculateSubscriptionEndDate = (
    startDate: Date,
    value: number,
    unit: PlanType | string
): Date => {
    switch (unit) {
        case PlanType.DAY:
        case 'DAY':
            return addDays(startDate, value);
        case PlanType.WEEK:
        case 'WEEK':
            return addWeeks(startDate, value);
        case PlanType.MONTH:
        case 'MONTH':
            return addMonths(startDate, value);
        case PlanType.YEAR:
        case 'YEAR':
            return addYears(startDate, value);
        default:
            return addMonths(startDate, value); // Default to months
    }
};
