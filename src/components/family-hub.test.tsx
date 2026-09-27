import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FamilyHub } from "./family-hub";
const fetchMock = vi.fn();
const account = { profile: { display_name: "테스트" }, memberships: [], received: [] };
function response(body: unknown) { return { ok: true, json: async () => body }; }
beforeEach(() => { sessionStorage.clear(); vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("collects a display name before exposing family actions", async () => {
  fetchMock.mockResolvedValueOnce(response({ ...account, profile: null })).mockResolvedValueOnce(response({ ok: true })).mockResolvedValueOnce(response(account));
  render(<FamilyHub onSelect={vi.fn()} onLogout={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText("이름"), { target: { value: "엄마" } });
  fireEvent.click(screen.getByText("회원가입 완료"));
  await screen.findByText("내 가족 그룹");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ displayName: "엄마" });
});
it("registers a received link without automatically accepting it", async () => {
  const token = "a".repeat(48); sessionStorage.setItem("ppanjjak_invite", token);
  fetchMock.mockResolvedValue(response(account));
  render(<FamilyHub onSelect={vi.fn()} onLogout={vi.fn()}/>);
  fireEvent.click(await screen.findByText("초대함에 추가"));
  await waitFor(() => expect(sessionStorage.getItem("ppanjjak_invite")).toBeNull());
  const mutations = fetchMock.mock.calls.filter(([, options]) => options?.method === "POST");
  expect(mutations).toHaveLength(1);
  expect(JSON.parse(mutations[0][1].body)).toEqual({ action: "claim", token });
});
it("sends an explicit decline and does not select a family", async () => {
  fetchMock.mockResolvedValue(response({ ...account, received: [{ id: "invite-id", household: { name: "우리 가족" }, status: "pending", expires_at: "2099-01-01" }] }));
  const select = vi.fn();
  render(<FamilyHub onSelect={select} onLogout={vi.fn()}/>);
  fireEvent.click(await screen.findByText("거절"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/invitations", expect.objectContaining({ body: JSON.stringify({ action: "respond", invitationId: "invite-id", accept: false }) })));
  expect(select).not.toHaveBeenCalled();
});
it("does not offer acceptance for expired or revoked invitations", async () => {
  fetchMock.mockResolvedValue(response({ ...account, received: [{ id: "old", status: "pending", expires_at: "2000-01-01" }, { id: "revoked", status: "revoked", expires_at: "2099-01-01" }] }));
  render(<FamilyHub onSelect={vi.fn()} onLogout={vi.fn()}/>);
  await screen.findByText("만료됨");
  expect(screen.queryByText("수락")).toBeNull();
});
it("shows a group entry for members but not admin invitation controls", async () => {
  fetchMock.mockResolvedValue(response({ ...account, memberships: [{ id: "m", household_id: "family", household: { name: "우리 가족" }, role: "member" }] }));
  const select = vi.fn().mockResolvedValue(undefined);
  render(<FamilyHub onSelect={select} onLogout={vi.fn()}/>);
  fireEvent.click(await screen.findByText("들어가기"));
  await waitFor(() => expect(select).toHaveBeenCalledWith("family"));
  expect(screen.queryByText("초대 링크 만들기")).toBeNull();
});
