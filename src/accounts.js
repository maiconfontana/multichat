
const AccountTemplate = `
<tr id="@ID">
  <th scope="row" class="font-monospace acct-link" style="cursor: pointer" title="Open Account">@ID</th>
  <td class="acct-name acct-link" style="cursor: pointer" title="Open Account">@NAME</td>
  <td>
    <button type="button" class="btn p-0 fs-5 mx-1 acct-edit" title="Edit Account" data-bs-toggle="modal" data-bs-target="#accountModal" data-bs-action="edit" data-bs-acct-id="@ID"><i class="bi bi-pencil-square"></i></button>
    <button type="button" class="btn p-0 fs-5 mx-1 acct-del" title="Delete Account" data-bs-toggle="modal" data-bs-target="#deleteModal" data-bs-acct-id="@ID"><i class="bi bi-person-x-fill"></i></button>
  </td>
</tr>`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const makeid = (length) => {
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}

const init = async () => {
	while (window.electron == undefined)
		await sleep(1);

	const setAccounts = (accounts) => {
		$(".acct-list").empty();
		for (const account of accounts)
		{
			const acct = AccountTemplate.replaceAll("@ID", account.id).replaceAll("@NAME", account.name);
			$(".acct-list").append($(acct));
			
			$(`#${account.id} .acct-link`).on("click", () => {
				window.electron.gotoAccount(account.id);
			});
			
			$(`#${account.id} .acct-del`).on("click", () => {
				$("#acct-account-remove-name").html(account.name);
				$("#acct-delete-button").attr("data-bs-acct-id", account.id);
			});
		}
	}

	window.electron.getAccounts().then((accounts) => {
		setAccounts(accounts);
	});
	
	window.electron.reloadAccounts(() => {
		console.log("Reload Accounts");
		window.electron.getAccounts().then((accounts) => {
			setAccounts(accounts);
		});
	});
	
}
init();

$("#accountModal").on("show.bs.modal", (event) => {
	const button = event.relatedTarget;
	const action = button.getAttribute('data-bs-action');
	
	$("#acct-action").val(action);
	$(".invalid-feedback").hide();

	if (action == "new")
	{
		$("#acct-id").val("");
		$("#acct-name").val("");
		$("#accountModalLabel").html("Account (new)");
	}
	else
	{
		const acctid = button.getAttribute('data-bs-acct-id');
		const name   = $(`#${acctid} .acct-name`).html();

		$("#acct-id").val(acctid);
		$("#acct-name").val(name);
		$("#accountModalLabel").html("Account (change)");
	}
});
$("#accountModal").on("shown.bs.modal", (event) => {
	$("#acct-name").focus();
});

$(".acct-save").on("click", () => {
	$("#accountForm").submit();
});

$("#acct-delete-button").on("click", (event) => {
	const acctid = $("#acct-delete-button").attr('data-bs-acct-id');
	
	bootstrap.Modal.getInstance("#deleteModal").hide();
	window.electron.deleteAccount(acctid);
});

$("#accountForm").on("submit", (event) => {
	event.preventDefault();
	
	if ($("#acct-action").val() == "new")
	{
		if (!$("#acct-name").val().trim())
		{
			$(".invalid-feedback").show();
		}
		else
		{
			$(".invalid-feedback").hide();
			window.electron.addAccount(makeid(10), $("#acct-name").val().trim());
			bootstrap.Modal.getInstance("#accountModal").hide();
		}
	}
	
	if ($("#acct-action").val() == "edit")
	{
		if (!$("#acct-name").val().trim())
		{
			$(".invalid-feedback").show();
		}
		else
		{
			$(".invalid-feedback").hide();
			window.electron.updateAccount($("#acct-id").val(), $("#acct-name").val().trim());
			bootstrap.Modal.getInstance("#accountModal").hide();
		}
	}
});

// screen share
const shareScreenTemplate = `
<div class="col">
  <div class="card mx-auto my-2" style="width: 12rem;">
    <img src="@IMGDATA" class="card-img-top">
	<div class="card-body text-center">
	  <input type="radio" class="btn-check" id="btn-@TYPE-@ID" name="share-id" value="@ID">
	  <label class="btn btn-sm btn-outline-success" for="btn-@TYPE-@ID">@NAME</label>
	</div>
  </div>
</div>`;

const shareRadioTemplate = `
<div class="form-check">
  <input type="radio" class="form-check-input btn-radio-window" id="btn-@TYPE-@ID" name="share-id" value="@ID" wa-img-data="@IMGDATA">
  <label class="form-check-label small" for="btn-@TYPE-@ID">@NAME</label>
</div>`;

const screenShareModal    = new bootstrap.Modal('#screenShareModal');
const screenShareCollapse = {
	"#share-screens": new bootstrap.Collapse("#share-screens", {parent: "#screenShareModal .modal-body", toggle: false}),
	"#share-windows": new bootstrap.Collapse("#share-windows", {parent: "#screenShareModal .modal-body", toggle: false})
};

$(".btn-share-type").on("click", function (e) {
	$(".btn-share-type").removeClass("active");
	$(this).addClass("active");
	const target = $(this).attr("data-bs-target");
	screenShareCollapse[target].show();
});

$("#btn-share-cancel").on("click", function () {
	console.log("share cancelled");
	screenShareModal.hide();
	window.electron.setShareCancelled();
});

$("#btn-share-ok").on("click", function () {
	const shareid = $("input[name=share-id]:checked").val();
	if (shareid)
	{
		console.log("ShareID", shareid);
		screenShareModal.hide();
		window.electron.setShareSelected(shareid);
	}
	else
	{
		console.log("ShareID not selected");
	}
});

let shareViewID = null;
const showScreenShareModal = (viewid) => {
	shareViewID = viewid;

	$("#share-screens").empty();
	$("#share-windows-radios").empty();

	window.electron.getShareSources().then((sources) => {
		for (const src of sources)
		{
			if (src.id.indexOf("screen") != -1)
			{
				let item = shareScreenTemplate.replace(/@TYPE/g, "screen").replace(/@ID/g, src.id).replace(/@NAME/g, src.name).replace(/@IMGDATA/g, src.thumb);
				$("#share-screens").append(item);
			}

			if (src.id.indexOf("window") != -1)
			{
				let item = shareRadioTemplate.replace(/@TYPE/g, "window").replace(/@ID/g, src.id).replace(/@NAME/g, src.name).replace(/@IMGDATA/g, src.thumb);
				$("#share-windows-radios").append(item);
			}
		}
		$(".btn-radio-window").on("change", function () {
			$("#share-windows-thumb").attr("src", $(this).attr("wa-img-data"));
		});
	});

	screenShareModal.show();
	$("[data-bs-target='#share-screens']").click().addClass("active");
};