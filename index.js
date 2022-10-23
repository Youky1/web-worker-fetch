const createWorker = (fn) => {
  const blob = new Blob([`(function ${fn.toString()})()`]);
  const url = window.URL.createObjectURL(blob);
  const worker = new Worker(url);
  return worker;
};

export default class WebWorkerFetch {
  constructor({ requestInterceptor, responseInterceptor } = {}) {
    this.worker = createWorker(this.workerRegister);
    if (requestInterceptor) {
      if (typeof requestInterceptor === "function") {
        this.requestInterceptor = requestInterceptor;
      } else {
        this.requestInterceptor = (opt) => opt;
        console.error("requestInterceptor must be a function");
      }
    }

    if (responseInterceptor) {
      if (typeof responseInterceptor === "function") {
        this.responseInterceptor = responseInterceptor;
      } else {
        this.responseInterceptor = (opt) => opt;
        console.error("responseInterceptor must be a function");
      }
    }
  }

  workerRegister() {
    self.addEventListener(
      "message",
      async function (e) {
        const { url, option } = e.data;
        try {
          const res = await fetch(url, option);
          const data = await res.text();
          self.postMessage({
            status: true,
            data: JSON.stringify(data)
          });
        } catch (e) {
          self.postMessage({
            type: false,
            data: e
          });
        }
      },
      false
    );
  }

  fetch(url, opt) {
    return new Promise((resolve, reject) => {
      const option = this.requestInterceptor(opt);
      this.worker.postMessage({ url, ...option });
      this.worker.onmessage = (event) => {
        const { data, status } = event.data;
        status ? resolve(this.responseInterceptor(data)) : reject(data);
      };
    });
  }
}
