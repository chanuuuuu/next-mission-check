import type { FormMappingConfig } from '@/types'

export const DEPARTMENT_MAINS = ['2청', '기타부서', '청장년'] as const
export type DepartmentMain = typeof DEPARTMENT_MAINS[number]

export const FORM_MAPPINGS: Record<DepartmentMain, FormMappingConfig> = {
  '2청': {
    sub_department_1: '소속부서(진)',
    sub_department_2: '소속부서(팀)',
    small_group: null,
    name: '이름',
    phone_last_four: '핸드폰 번호',
    church_name: '연계교회 이름',
    arrival_time: '도착 예상시간',
    use_personal_car: '자차를 가져 오시나요',
    use_return_bus: '교회 버스에 탑승하시나요',
  },
  기타부서: {
    sub_department_1: '소속부서',
    sub_department_2: null,
    small_group: null,
    name: '이름',
    phone_last_four: '핸드폰 번호',
    church_name: null,
    arrival_time: '도착 예상시간',
    use_personal_car: '자차를 가져 오시나요',
    use_return_bus: '교회 버스에 탑승하시나요',
  },
  청장년: {
    sub_department_1: '세부소속(진)',
    sub_department_2: '연계교회 이름',
    small_group: '소속 목장',
    name: '이름',
    phone_last_four: '핸드폰 번호',
    church_name: null,
    arrival_time: '도착 예상시간',
    use_personal_car: '자차를 가져 오시나요',
    use_return_bus: '교회 버스에 탑승하시나요',
  },
}

// GAS namedValues는 배열로 감싸져 있으므로 첫 번째 원소를 사용
export function extractFromNamedValues(
  namedValues: Record<string, string[]>,
  mapping: FormMappingConfig
): Partial<Record<keyof FormMappingConfig, string>> {
  const find = (keyword: string | null) => {
    if (!keyword) return undefined
    const key = Object.keys(namedValues).find((k) => k.includes(keyword))
    return key ? namedValues[key][0]?.trim() : undefined
  }

  return {
    sub_department_1: find(mapping.sub_department_1),
    sub_department_2: find(mapping.sub_department_2) ?? undefined,
    small_group: find(mapping.small_group) ?? undefined,
    name: find(mapping.name),
    phone_last_four: find(mapping.phone_last_four),
    church_name: find(mapping.church_name) ?? undefined,
    arrival_time: find(mapping.arrival_time),
    use_personal_car: find(mapping.use_personal_car),
    use_return_bus: find(mapping.use_return_bus),
  }
}

export function parseBooleanField(value: string | undefined): boolean | null {
  if (!value) return null
  return value.includes('예') || value.includes('네') || value.toLowerCase().includes('yes')
}
