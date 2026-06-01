"use client";

import { Car, Bus } from "lucide-react";
import type { MissionRegistration } from "@/types";

function parseArrivalTime(value: string | null): string | null {
  if (!value) return null;
  return (
    value
      .replace(/^\d+\)\s*/, "")
      .replace(/\s*\([^)]*식사[^)]*\)/g, "")
      .trim() || null
  );
}

function parseCarDuringMission(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("네")) return "O";
  if (value.startsWith("아니오")) return "X";
  return value;
}

interface Props {
  rows: MissionRegistration[];
  isFetching?: boolean;
  renderPayment: (row: MissionRegistration) => React.ReactNode;
}

export function RegistrationList({ rows, isFetching, renderPayment }: Props) {
  return (
    <>
      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-2 md:hidden">
        {rows.map((r) => (
          <article
            key={r.id}
            className="bg-background border border-foreground p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-display text-sm font-bold truncate">
                  {r.name}
                </span>
                <span className="text-sm text-muted-foreground shrink-0">
                  ({r.phone_last_four})
                </span>
              </div>
              {renderPayment(r)}
            </div>
            <div className="mt-1.5 text-sm text-muted-foreground">
              {r.church_name ?? r.small_group ?? "-"}
            </div>
            {r.schedule_survey && (
              <div className="mt-1 text-sm text-muted-foreground">
                {r.schedule_survey.split(":")[0]}
              </div>
            )}
            {/* 이동 정보 */}
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
              <TransportRow
                label="서울→영동"
                value={r.use_personal_car}
                trueIcon={<Car size={14} />}
                trueText="자차"
                falseIcon={<Bus size={14} />}
                falseText="교회버스"
                emphasize
              />
              <TransportRow
                label="영동→서울"
                value={r.use_return_bus}
                trueIcon={<Bus size={14} />}
                trueText="교회버스"
                falseIcon={<Car size={14} />}
                falseText="자차"
                emphasize
              />
              {parseArrivalTime(r.arrival_time) && (
                <div className="col-span-2 text-xs text-muted-foreground">
                  <span className="mr-1">도착</span>
                  <span className="font-display font-bold text-foreground text-sm">
                    {parseArrivalTime(r.arrival_time)}
                  </span>
                </div>
              )}
              {parseCarDuringMission(r.use_car_during_mission) && (
                <div className="col-span-2 text-xs text-muted-foreground">
                  <span className="mr-1">선교 중 자차사용</span>
                  <span className="font-display font-bold text-foreground text-sm">
                    {parseCarDuringMission(r.use_car_during_mission)}
                  </span>
                </div>
              )}
            </div>
          </article>
        ))}
        {!isFetching && rows.length === 0 && <EmptyState />}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-background border border-foreground overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">연락처</th>
                <th className="px-4 py-3">교회 / 목장</th>
                <th className="px-4 py-3">참여 일정</th>
                <th className="px-4 py-3 text-foreground">서울→영동</th>
                <th className="px-4 py-3">도착 예상시간</th>
                <th className="px-4 py-3 text-foreground">영동→서울</th>
                <th className="px-4 py-3">선교 중 자차사용</th>
                <th className="px-4 py-3 text-right">납부</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    ({r.phone_last_four})
                  </td>
                  <td className="px-4 py-3">
                    {r.church_name ?? r.small_group ?? "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {r.schedule_survey ? r.schedule_survey.split(":")[0] : "-"}
                  </td>
                  {/* 서울→영동 강조 */}
                  <td className="px-4 py-3 whitespace-nowrap font-display font-bold">
                    <span className="inline-flex items-center gap-1">
                      {r.use_personal_car === null ? (
                        <span className="text-muted-foreground/50 font-normal">
                          -
                        </span>
                      ) : r.use_personal_car ? (
                        <>
                          <Car size={14} /> 자차
                        </>
                      ) : (
                        <>
                          <Bus size={14} /> 교회버스
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {parseArrivalTime(r.arrival_time) ?? "-"}
                  </td>
                  {/* 영동→서울 강조 */}
                  <td className="px-4 py-3 whitespace-nowrap font-display font-bold">
                    <span className="inline-flex items-center gap-1">
                      {r.use_return_bus === null ? (
                        <span className="text-muted-foreground/50 font-normal">
                          -
                        </span>
                      ) : r.use_return_bus ? (
                        <>
                          <Bus size={14} /> 교회버스
                        </>
                      ) : (
                        <>
                          <Car size={14} /> 자차
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {parseCarDuringMission(r.use_car_during_mission) ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right">{renderPayment(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isFetching && rows.length === 0 && <EmptyState />}
        </div>
      </div>
    </>
  );
}

function TransportRow({
  label,
  value,
  trueIcon,
  trueText,
  falseIcon,
  falseText,
  emphasize,
}: {
  label: string;
  value: boolean | null;
  trueIcon: React.ReactNode;
  trueText: string;
  falseIcon: React.ReactNode;
  falseText: string;
  emphasize?: boolean;
}) {
  if (value === null) return null;
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground shrink-0">
        {label}
      </span>
      <span
        className={
          "inline-flex items-center gap-0.5 font-display font-bold " +
          (emphasize ? "text-sm text-foreground" : "text-xs")
        }
      >
        {value ? trueIcon : falseIcon}
        {value ? trueText : falseText}
      </span>
    </div>
  );
}

export function PaymentBadge({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex items-center bg-foreground text-background px-2 py-0.5 font-display font-bold text-[10px] uppercase tracking-widest shrink-0">
      납부 완료
    </span>
  ) : (
    <span className="inline-flex items-center bg-brand text-white px-2 py-0.5 font-display font-bold text-[10px] uppercase tracking-widest shrink-0">
      납부 필요
    </span>
  );
}

export function PaymentToggle({
  paid,
  onToggle,
}: {
  paid: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 shrink-0"
      aria-label="납부 상태 토글"
    >
      <PaymentBadge paid={paid} />
      <span
        className={
          "relative inline-block w-8 h-4 border-2 border-foreground transition-colors " +
          (paid ? "bg-foreground" : "bg-background")
        }
      >
        <span
          className={
            "absolute top-0.5 w-2 h-2 transition-all " +
            (paid ? "left-[14px] bg-background" : "left-0.5 bg-brand")
          }
        />
      </span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
        결과 없음
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        검색 조건을 변경해 보세요.
      </p>
    </div>
  );
}
