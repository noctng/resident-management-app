const API_BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...init } = options;

    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const defaultHeaders: Record<string, string> = {};
    if (!(init.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    // Merge headers safely
    const headers = new Headers(defaultHeaders);
    if (init.headers) {
      new Headers(init.headers).forEach((value, key) => {
        if (init.body instanceof FormData && key.toLowerCase() === 'content-type') {
          return; // Allow browser/fetch to set multipart/form-data with boundary
        }
        headers.set(key, value);
      });
    }

    if (init.body instanceof FormData) {
      headers.delete('content-type');
      headers.delete('Content-Type');
    }

    // Default credentials to include for auth
    init.credentials = init.credentials || 'include';

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `API Error: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    // Return null for 204 No Content
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  get<T>(
    endpoint: string,
    params?: RequestOptions['params'],
    options?: Omit<RequestOptions, 'params'>
  ) {
    return this.request<T>(endpoint, { ...options, method: 'GET', params });
  }

  post<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'body'>) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  put<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'body'>) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  patch<T>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'body'>) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // For file uploads
  upload<T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') {
    return this.request<T>(endpoint, {
      method,
      body: formData,
    });
  }

  // Generic download method
  async download(endpoint: string, data?: any, method: 'POST' | 'GET' = 'POST'): Promise<Blob> {
    let url = `${API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      credentials: 'include',
    };

    if (data) {
      if (method === 'GET') {
        const searchParams = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      } else {
        options.headers = {
          'Content-Type': 'application/json',
        };
        options.body = JSON.stringify(data);
      }
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.message || `Download Error: ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    return response.blob();
  }
}

export const api = new ApiService();
