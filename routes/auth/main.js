//main.js

// 샘플 데이터 (서버 없이 테스트용)
let members = [
  {id: 1, studentNo: "406", name: "임소영", username: "lim_sso_", suspended: false},
  {id: 2, studentNo: "402", name: "송민채", username: "song_m_ch", suspended: false},
];

function renderTable() {
  const tbody = document.querySelector("#memberTable tbody");
  tbody.innerHTML = "";
  members.forEach(m => {
    const tr = document.createElement("tr");
    if (m.suspended) tr.classList.add("suspended");
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${m.studentNo}</td>
      <td>${m.name}</td>
      <td>${m.username}</td>
      <td>
        <button onclick="deleteMember(${m.id})">삭제</button>
        <button onclick="suspendMember(${m.id})">정지</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteMember(id) {
  if (!confirm("정말 삭제할까요?")) return;
  members = members.filter(m => m.id !== id);
  renderTable();
}

function suspendMember(id) {
  const days = prompt("몇 일 정지시킬까요?");
  if (!days || isNaN(days)) {
    alert("숫자를 입력해주세요.");
    return;
  }
  const member = members.find(m => m.id === id);
  if (member) {
    member.suspended = true;
    renderTable();
    alert(`${member.name}님이 ${days}일 정지되었습니다.`);
  }
}

window.onload = renderTable;
