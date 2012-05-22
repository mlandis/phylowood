function handleFileSelect(evt) {
	var output = [];
	var f = evt.target.files[0];
	var fr = new FileReader();

	fr.onloadend = function(e) {
        	var txtArea = document.createElement('textarea');
		txtArea.value = this.result;
		document.body.appendChild(txtArea);
	};
	fr.onerror = function(e) {
		alert("error");
	};
	fr.onload = function(e) {
		var txt = e.target.result;
		alert(txt);
	};
/*
	fr.onerror = function(stuff) {
		console.log("error", stuff);
		console.log(stuff.getMessage());
	};*/
	fr.readAsText(f);
	document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);
