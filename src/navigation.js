import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  Link2,
  Network,
  SlidersHorizontal,
  Users,
  Workflow,
} from 'lucide-react'

export const navigation = [
  {
    label: 'Directory',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        icon: LayoutDashboard,
        end: true,
        phase: 'Phase 6',
        summary:
          'Counts for employees, brands, processes, pods, availability, coverage, conflicts, and recent roster activity will be calculated from stored records.',
      },
      {
        to: '/employees',
        label: 'Employees',
        icon: Users,
        phase: 'Phase 3',
        summary:
          'Maintain employee records, pod membership, weekly offs, and the brands and processes each person can cover.',
      },
      {
        to: '/brands',
        label: 'Brands',
        icon: Building2,
        phase: 'Phase 3',
        summary:
          'Maintain brands and see the employees and processes attached to each one.',
      },
      {
        to: '/processes',
        label: 'Processes',
        icon: Workflow,
        phase: 'Phase 3',
        summary:
          'Maintain operational processes such as Customer Support, Abandoned Cart, NDR, and Retention.',
      },
      {
        to: '/pods',
        label: 'Pods',
        icon: Network,
        phase: 'Phase 3',
        summary:
          'Group employees into pods, assign a pod lead, and review pod coverage.',
      },
      {
        to: '/assignments',
        label: 'Assignments',
        icon: Link2,
        phase: 'Phase 3',
        summary:
          'Link employees to brand-processes without changing application code.',
      },
      {
        to: '/working-rules',
        label: 'Working rules',
        icon: SlidersHorizontal,
        phase: 'Phase 3',
        summary:
          'Set the operating calendar, holiday policy, shift, and minimum staffing for each brand-process.',
      },
      {
        to: '/leave',
        label: 'Leave and holidays',
        icon: CalendarRange,
        phase: 'Phase 3',
        summary:
          'Record public holidays, weekly offs, approved leave, pending leave, comp-offs, and other blocked dates.',
      },
    ],
  },
  {
    label: 'Scheduling',
    items: [
      {
        to: '/roster',
        label: 'Monthly roster',
        icon: CalendarDays,
        phase: 'Phase 5',
        summary:
          'Generate a month, inspect coverage by company, pod, brand, process, and employee, then keep every saved version.',
      },
      {
        to: '/conflicts',
        label: 'Conflicts',
        icon: AlertTriangle,
        phase: 'Phase 5',
        summary:
          'Read the cause of each coverage problem, including required staff, eligible people, and a possible resolution.',
      },
    ],
  },
]

export const flatNavigation = navigation.flatMap((group) => group.items)

export function findNavItem(pathname) {
  return flatNavigation.find((item) => pathname === item.to) ?? null
}
