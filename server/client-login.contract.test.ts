import {describe,it,expect} from 'vitest';
import {getLoginConfiguration} from '../client/src/const';
describe('Login configuration contract',()=>{
 it('does not offer a login flow without portal and app identity',()=>{
  expect(getLoginConfiguration({})).toBeNull();
  expect(getLoginConfiguration({VITE_OAUTH_PORTAL_URL:'https://oauth.example.test'})).toBeNull();
 });
 it('rejects invalid, insecure and credential-bearing portal URLs',()=>{
  for(const portal of ['undefined','http://oauth.example.test','javascript:alert(1)','https://user:example@oauth.example.test'])
   expect(getLoginConfiguration({VITE_OAUTH_PORTAL_URL:portal,VITE_APP_ID:'test-app'})).toBeNull();
 });
 it('accepts an explicitly configured HTTPS portal',()=>{
  expect(getLoginConfiguration({VITE_OAUTH_PORTAL_URL:'https://oauth.example.test',VITE_APP_ID:'test-app'})?.appId).toBe('test-app');
 });
});
